import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3_deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
import { HttpMethods } from 'aws-cdk-lib/aws-s3';

export class WebIdentityLabStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const patchesBucket = new s3.Bucket(this, 'patchesBucket', {
      cors: [{allowedHeaders: ['*'], allowedOrigins:['*'], allowedMethods: [HttpMethods.GET, HttpMethods.HEAD]}]
    });

    const appBucket = new s3.Bucket(this, 'appBucket', {
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      accessControl: s3.BucketAccessControl.PUBLIC_READ,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html'
    });

    const policyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      principals: [new iam.AnyPrincipal()],
      resources: [`${appBucket.bucketArn}/*`]
    });

    appBucket.addToResourcePolicy(policyStatement);

    const policyStatementPatchesBucket = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:ListBucket", "s3:GetObject"],
      resources: [patchesBucket.bucketArn, patchesBucket.bucketArn + '/*'],
    });

    const managedPolicy = new iam.ManagedPolicy(this, 'managedPolicyPrivateBucket');
    managedPolicy.addStatements(policyStatementPatchesBucket);

    new s3_deploy.BucketDeployment(this, 'AppBucketDeployment', {
      sources: [s3_deploy.Source.asset('assets/appbucket')],
      destinationBucket: appBucket
    });

    const cloudfrontDistribution = new cloudfront.Distribution(this, 'cloudfrontDistribution', {
      enabled: true,
      defaultBehavior: { 
        origin: new origins.S3Origin(appBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY
      },
      defaultRootObject: 'index.html',
    });

    new CfnOutput(this, 'websiteUrl', {
      value: appBucket.bucketWebsiteUrl,
      description: 'URL for website hosted on S3'
    });

    new CfnOutput(this, 'S3BucketSecureURL', {
      value: appBucket.bucketDomainName,
      description: 'app bucket URL',
    });
  }
}
