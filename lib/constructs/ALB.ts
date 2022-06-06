import { Construct } from 'constructs';
import { CfnListener, CfnLoadBalancer, CfnTargetGroup, Protocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import {  CfnAutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { CfnLaunchTemplate, CfnSecurityGroup, CfnVPC } from 'aws-cdk-lib/aws-ec2';
import { CfnOutput, Fn } from 'aws-cdk-lib';
import { Subnet } from './Subnet';
import { CfnInstanceProfile, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';


interface ALBProps {
    websg: CfnSecurityGroup,
    albsg: CfnSecurityGroup,
    subnets: Subnet,
    vpc: CfnVPC,
    bucket: Bucket
}

export class ALB extends Construct {
    constructor(scope: Construct, id: string, props: ALBProps){
        super(scope, id)
    
        const { vpc, bucket, subnets, websg, albsg } = props

        // Web AMI
        const imageId = 'ami-<xxxxxxxxx>'  
      
        // Role for EC2 Instance Profile
        const role = new Role(this, 'webRole', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
            description: 'Role for web instances',
        });

        role.addToPolicy(new PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [`${bucket.bucketArn}/*`]
        }))
        
        const webInstanceProfile = new CfnInstanceProfile(this, 'webInstanceProfile', {
            roles: [role.roleName],
            instanceProfileName: 'webInstanceProfile',
        });

        // User Data script to copy DB endpoint to web folder
        const userData = Fn.base64('#!/usr/bin/env bash \n sudo aws s3 cp s3://assets-rds-endpoint-pm-323912/db.txt /var/www/html/db.txt')

        // Launch Template
        const launchTemplateData: CfnLaunchTemplate.LaunchTemplateDataProperty = {
            imageId, // Amazon Linux 2 with Apache, PHP and the website 
            instanceType: 't2.micro',
            iamInstanceProfile: { 
                arn: webInstanceProfile.attrArn
            },
            networkInterfaces: [{
                associatePublicIpAddress: false,
                deviceIndex: 0,
                groups: [websg.attrGroupId],
                subnetId: subnets.webA.attrSubnetId,
            }],
            keyName: 'mpkey',
            userData
        }

        const launchTemplate = new CfnLaunchTemplate(this, 'launch-template', {
            launchTemplateData,
            launchTemplateName: 'launch-template'
        })
        
        // Load Balancer
        const alb = new CfnLoadBalancer(this, 'cfn-alb', {
            name: 'website-lb',
            securityGroups: [albsg.attrGroupId],
            subnets: [subnets.webA.attrSubnetId, subnets.webB.attrSubnetId],
        })

        // Target Group
        const tg = new CfnTargetGroup(this, 'target-group', {
            port: 80,
            protocol: Protocol.HTTP,
            vpcId: vpc.ref,
        })

        // Auto Scaling group
        const asg = new CfnAutoScalingGroup(this, 'asg', {
            minSize: '1',
            maxSize: '3',
            autoScalingGroupName: 'asg-mp', 
            launchTemplate: {
                version: launchTemplate.attrLatestVersionNumber,
                launchTemplateId: launchTemplate.ref,
            },
            targetGroupArns: [tg.ref],
            vpcZoneIdentifier: [subnets.webA.attrSubnetId, subnets.webB.attrSubnetId]
        })

        // Listener
        new CfnListener(this, 'cfn-listener', {
            defaultActions:[{
                type: 'forward',
                forwardConfig: {
                    targetGroups: [{
                        targetGroupArn: tg.ref
                    }]
                }
            }],
            loadBalancerArn: alb.ref,
            port: 80,
            protocol: Protocol.HTTP,

        })
        
        // Output Load Balancer public endpoint after deployment
        new CfnOutput(this, 'loadbalancer-ip', {
            value: alb.attrDnsName
        })

    }
}