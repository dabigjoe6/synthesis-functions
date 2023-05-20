import * as cdk from 'aws-cdk-lib';
import { SynthesisStack } from '../lib/synthesis-stack.js';

const app = new cdk.App();
new SynthesisStack(app, process.env.FUNCTION_NAME + 'Stack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});