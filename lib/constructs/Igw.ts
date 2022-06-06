import { CfnInternetGateway, CfnVPCGatewayAttachment, CfnVPC } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

interface IGWProps {
    vpc: CfnVPC
}

export class IGW extends Construct {
    public readonly igw: CfnInternetGateway

    constructor(scope: Construct, id: string, props: IGWProps){
        super(scope, id)

        const { vpc } = props

        // Create Internet Gateway
        this.igw = new CfnInternetGateway(this, `igw-mp`, { tags:[{key: "Name", value: `igw-mp`}] })

        // Attach Internet Gateway
        new CfnVPCGatewayAttachment(this, `vpcgw-mp`, {
            vpcId: vpc.ref,
            internetGatewayId: this.igw.ref
          })
    }
}