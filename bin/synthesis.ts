import * as cdk from 'aws-cdk-lib';
import { SynthesisStack } from '../lib/synthesis-stack.js';

const app = new cdk.App();
new SynthesisStack(app, 'SynthesisStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});