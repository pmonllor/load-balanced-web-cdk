import { CfnVPC } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class VPC extends Construct {
    public readonly vpc: CfnVPC

    constructor(scope: Construct, id: string){
        super(scope, id)

        // VPC
        this.vpc = new CfnVPC(this, `vpc`, {
            cidrBlock: '10.0.0.0/16',
            enableDnsHostnames: true,
            enableDnsSupport: true,
            instanceTenancy: 'default',
            tags:[{ key: 'Name', value: `vpc-mp` }]
          })
    }
}