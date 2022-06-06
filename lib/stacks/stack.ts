import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VPC } from '../constructs/Vpc'
import { Subnet } from '../constructs/Subnet'
import { SecurityGroup } from '../constructs/SecurityGroup';
import { IGW } from '../constructs/Igw';
import { RTable } from '../constructs/RTable';
import { ALB } from '../constructs/ALB';
import { RDS } from '../constructs/RDS';

export class NetworkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const { vpc } = new VPC(this, 'vpc-mp')
    
    const subnets = new Subnet(this, 'subnets', { vpc } )

    const securityGroups = new SecurityGroup(this, 'SGs', { vpc })

    const igw = new IGW(this, 'IGW', { vpc })
    
    new RTable(this, 'rtables', { vpc, subnets, igw})

    const { bucket } = new RDS(this, 'mp-rds', { subnets, sg: securityGroups })
    
    const alb = new ALB(this, 'ALB', { 
      websg: securityGroups.web, 
      albsg: securityGroups.alb, 
      subnets, vpc, bucket 
      })

    alb.node.addDependency(bucket) 
  }
}
