import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class SynthesisStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const queue = new cdk.aws_sqs.Queue(this, 'SynthesisQueue', {
      visibilityTimeout: cdk.Duration.minutes(30),
      retentionPeriod: cdk.Duration.days(4),
      deliveryDelay: cdk.Duration.seconds(0),

    });

    new lambda.DockerImageFunction(this, 'SynthesisLambda', {
      code: lambda.DockerImageCode.fromEcr(cdk.aws_ecr.Repository.fromRepositoryArn(this, 'synthesis_repo', 'arn:aws:ecr:eu-west-2:240699656698:repository/subscriptions')), // Specify the path to your Dockerfile
      memorySize: 2024,
      ephemeralStorageSize: cdk.Size.mebibytes(2024),
      timeout: cdk.Duration.minutes(5),
      events: [new SqsEventSource(queue)],
      environment: {
        BASE_URL: "https://38ad-2a01-4b00-86ff-f600-1e4-12ce-7517-c42b.ngrok-free.app",
        FROM: "josepholabisi6000@gmail.com",
        NO_OF_POSTS_SENT_TO_USERS: "1",
        OPENAI_API_KEY: "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",
        SENDGRID_API_KEY: "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",
        SYNC_HOURS: "4"
      }
    });
  }
}