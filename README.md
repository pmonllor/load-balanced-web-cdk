# Load Balanced Web Server with RDS

This code creates an infrastructure consisting of

* Application Load Balancer 
* Auto Scaling group
* Launch Template
* RDS Instance
* Lambda function to write to S3
* VPC
* Subnets
* Security Groups
* Internet Gateway

## Requirements

You need to assign your own AMI inside the ALB construct