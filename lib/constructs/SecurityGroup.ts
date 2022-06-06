import { CfnSecurityGroup, CfnVPC, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

interface SGProps { vpc: CfnVPC }

export class SecurityGroup extends Construct {
    public readonly web: CfnSecurityGroup
    public readonly db: CfnSecurityGroup
    public readonly alb: CfnSecurityGroup

    constructor(scope: Construct, id: string, props: SGProps) {
        super(scope, id)
        const vpcId = props.vpc.ref

        // Load Balancer Security Group
        this.alb = new CfnSecurityGroup(this, `alb-sg`, {
            vpcId,
            groupDescription: `alb-sg`,
            groupName: `alb-sg`,
            tags: [{ key:"Name", value: `alb-sg` }],
            securityGroupIngress: [{
                cidrIp: '0.0.0.0/0',
                description: 'Allow HTTP access from the internet',
                ipProtocol: 'tcp',
                fromPort: 80,
                toPort: 80
                }]
            })

        // Web Security Group
        this.web = new CfnSecurityGroup(this, `web-sg`, {
            vpcId,
            groupDescription: `web-sg`,
            groupName: `web-sg`,
            tags: [{ key:"Name", value: `web-sg` }],
            securityGroupIngress: [{
                sourceSecurityGroupId: this.alb.attrGroupId,
                description: 'Allow HTTP access from ALB Security Group',
                ipProtocol: 'tcp',
                fromPort: 80,
                toPort: 80
                }]
        })

        // DB Security Group
        this.db = new CfnSecurityGroup(this, `db-sg`, {
            vpcId,
            groupDescription: `db-sg`,
            groupName: `db-sg`,
            tags: [{ key:"Name", value: `db-sg` }],
            securityGroupIngress: [{
                sourceSecurityGroupId: this.web.attrGroupId,
                description: 'Allow SQL access from Web security group',
                ipProtocol: 'tcp',
                fromPort: 3306,
                toPort: 3306
                }]
            })
    }
}