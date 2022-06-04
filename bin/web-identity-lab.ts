#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { WebIdentityLabStack } from '../lib/web-identity-lab-stack';

const app = new cdk.App();
new WebIdentityLabStack(app, 'WebIdentityLabStack');
