import { CfnRouteTable, CfnRoute, CfnSubnetRouteTableAssociation, CfnVPC } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { IGW } from "./Igw";
import { Subnet } from './Subnet'

interface RTProps {
    vpc: CfnVPC,
    subnets: Subnet,
    igw: IGW
}

export class RTable extends Construct {
    constructor(scope: Construct, id: string, props: RTProps){
        super(scope, id)

        const { vpc, subnets, igw } = props

        // Route Table
        const webrt = new CfnRouteTable(this, `web-rtable`, {
            vpcId: vpc.ref,
            tags: [{key:"Name", value: `web-rtable`}]
        })
        
        // Add route
        new CfnRoute(this, `web-route`, {
            routeTableId: webrt.attrRouteTableId,
            destinationCidrBlock: '0.0.0.0/0',
            gatewayId: igw.igw.ref
        })

        // Associate Route Table to both web subnets
        new CfnSubnetRouteTableAssociation(this, `webA-srta`, {
            routeTableId: webrt.attrRouteTableId,
            subnetId: subnets.webA.attrSubnetId
        })

        new CfnSubnetRouteTableAssociation(this, `webB-srta`, {
            routeTableId: webrt.attrRouteTableId,
            subnetId: subnets.webB.attrSubnetId
        })
    }
}