#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from './lib/stacks/stack';

const app = new cdk.App();

new NetworkStack(app, 'NetworkStack', {});
