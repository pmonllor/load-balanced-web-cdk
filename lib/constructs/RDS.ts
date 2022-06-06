import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import { CfnDBInstance, CfnDBSubnetGroup } from "aws-cdk-lib/aws-rds";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { CfnFunction, Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
import { Subnet } from "./Subnet";
import { SecurityGroup } from "./SecurityGroup";

interface RDSProps {
    subnets: Subnet,
    sg: SecurityGroup
}

export class RDS extends Construct {
    public readonly bucket: Bucket

    constructor (scope: Construct, id: string, props: RDSProps){
        super(scope, id)

        const { subnets, sg } = props

        // Get DB password from Secure String Parameter
        const dbpw = StringParameter.fromSecureStringParameterAttributes(this, 'master-user', { 
            parameterName: '/rds/master-pw', 
            version: 1
        });

        const dbuser = 'mpadmin'

        const { dbSubnetGroupName } = new CfnDBSubnetGroup(this, 'subnet-db', {
            dbSubnetGroupName: 'db-subnet-group',
            dbSubnetGroupDescription: 'Subnet group for RDS instances',
            subnetIds: [subnets.db.attrSubnetId, subnets.dbB.attrSubnetId]
        })

        // Create DB Instance
        const db = new CfnDBInstance(this, 'mp-db', {
            dbInstanceIdentifier: 'mouseplanet-db',
            dbInstanceClass: 'db.t2.micro',
            engine: 'mariadb',
            engineVersion: '10.4.21',
            dbSubnetGroupName,
            vpcSecurityGroups: [sg.db.attrGroupId],
            multiAz: false,
            storageType: 'standard', // Magnetic storage 
            storageEncrypted: false,
            allocatedStorage: '5',
            availabilityZone: 'us-east-1a',
            port: '3306',
            masterUsername: dbuser,
            masterUserPassword: dbpw.stringValue,
            publiclyAccessible: false,
            dbName: 'mouseplanet',
            licenseModel: 'general-public-license',
        })

        // Create assets bucket
        const bucket = new Bucket(this, 'bucket-php', {
            bucketName: 'assets-rds-endpoint-pm-323912',
            publicReadAccess: false,
            autoDeleteObjects: true,
            removalPolicy: RemovalPolicy.DESTROY
        })

        // Role to allow function to write to the assets bucket
        const writeRole = new Role(this, 'write-role', {
            roleName: 'writeS3Role',
            assumedBy: new ServicePrincipal('lambda.amazonaws.com')
        })

        writeRole.addToPolicy(new PolicyStatement({
            actions: ['s3:PutObject'],
            resources: [`${bucket.bucketArn}/*`]
        }))

        // Export bucket to reference in another construct
        this.bucket = bucket

        // Lambda Function to write to assets bucket
        const writeS3 = new Function(this, 'write-s3', {
            functionName: 'write-to-s3',
            code: Code.fromAsset('./scripts/write_file'),
            runtime: Runtime.NODEJS_16_X,
            handler: 'index.handler',
            environment: { 
                'API_ENDPOINT': db.attrEndpointAddress,
                'BUCKET_NAME': bucket.bucketName 
            },
            role: writeRole,
        })

        // Custom Resource that invokes Lambda Function on deployment
        new AwsCustomResource(this, 'invoke-write-file', {
            policy: AwsCustomResourcePolicy.fromStatements([new PolicyStatement({
                actions: ['lambda:InvokeFunction'],
                resources: [writeS3.functionArn] 
            })]),
            onCreate: {
                service: 'Lambda',
                action: 'invoke',
                parameters: {
                  FunctionName: writeS3.functionName,
                  InvocationType: 'Event'
                },
                physicalResourceId: PhysicalResourceId.of('writeFileOnDeployment')
            }
        })
    }
}