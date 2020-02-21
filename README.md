# sts-broker

This project can be used as a reference for a serverless custom Identity Broker architecture.

- Why would you need a Identity Broker?
    - Limit of how many IAM roles/users an AWS account can have.
    - Flexibility to manage permissions used among IAM roles/users.
    - Record every permission request made (traceability).
    - Least privilege access: Avoid sharing same permissions among federated users.
    - Implement a strong identity foundation.


## Architecture

![STS Broker Architecture](https://github.com/timothyBRZ/sts-broker/raw/master/AWS%20STS%20broker.png "STS Broker architecture")

## Deploy the sample application


To prepare the application for deployment, use the `sam package` command.

```bash
$ sam package --output-template-file packaged.yaml --s3-bucket BUCKET_NAME --region AWS_REGION --profile <PROFILE>
```

The SAM CLI creates deployment packages, uploads them to the S3 bucket, and creates a new version of the template that refers to the artifacts in the bucket. 

To deploy the application, use the `sam deploy` command.

```bash
$ sam deploy --template-file packaged.yaml --stack-name sts-broker --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND --region AWS_REGION --profile <PROFILE>
```

## Customize your Identity Broker

#### Populate team preferences table:

Your 'team_preferences' table must have the following attributes:

- team_id (Partition Key):  A unique ID for the team the federated user belongs to. This must be available on the user ID token. User Pool has a custom attribute named 'team'.

- role: The IAM Role members of this team will be able to assume. This role must include Lambda execution role in its Trust Relationship.

*** If team does not have a IAM role associated, the default role created within the stack will be used.

Example:
```bash
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "<LAMBDA_EXECUTION_ROLE_ARN>"
      },
      "Action": [
          "sts:AssumeRole",
          "sts:TagSession"
      ]
    }
  ]
}
```

- preferred_channel: If manual approval is needed, where to contact the security admin (email or slack).

*** If preferred_channel is 'email' but there is no email defined for this team, we will send the notification for the e-mail passed on the DefaultSecurityAdminEmailID parameter.

- email: Security admin e-mail if preferred channel is 'email'. If this is defined on the team_preferences table, we also need to create a subscription on the SNS topic with the following subscription filter policy:
```bash
{
  "channel": [
    "email"
  ],
  "team": [
    "<TEAM_ID>"
  ]
}
```
- slack_webhook_url: Slack channel webhook URL if preferred channel is 'slack'.


#### Use your own permission request evaluation logic:

Each company will have different rules to automatically approve a permission request. 

Hence, you have the option to provide a S3 bucket location with your own Lambda function deployment package zip file.

Your code will receive as the input the permission_request object and team info.

It simply needs to return an "automated_approval" attribute:

```bash
const response = {
    automated_approval: <true or false>
};

return response;
```

If you do not provide your custom permission request evaluation code, a default one will be used.

## Invoke STS Broker

We first need to get the API URL created:

```bash
$ export api_url=$(aws cloudformation describe-stacks --stack-name sts-broker --query "Stacks[0].Outputs[?OutputKey=='STSBrokerAPI'].OutputValue" --output text --profile <PROFILE>)
```

And the Cognito UserPool ID/ Client App ID:

```bash
$ export user_pool_id=$(aws cloudformation describe-stacks --stack-name sts-broker --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolID'].OutputValue" --output text --profile <PROFILE>)
$ export user_pool_client_id=$(aws cloudformation describe-stacks --stack-name sts-broker --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolClientID'].OutputValue" --output text --profile <PROFILE>)
```

The policy request will have the following parameters:

- inline_policy
- policyARNs
- tags

We can write the policy request to a local file:

```bash
$ echo '{"inline_policy":{"Version":"2012-10-17","Statement":[{"Sid":"Stmt2","Effect":"Allow","Action":"sqs:*","Resource":"*"}]},"policyARNs":["arn:aws:iam::aws:policy/AmazonS3FullAccess"],"tags":[{"Key":"customtag","Value":"custom value"}]}' > permission_request.json
```

Now we can call the request permission API using 'cognitocurl' CLI tool:

```bash
$ cognitocurl --cognitoclient <COGNITO_USER_POOL_CLIENT> --userpool <COGNITO_USER_POOL> --run "curl -X POST $api_url'credentials/request' -H 'content-type: application/json' --data @permission_request.json"
```

Once permissions are approved by security admin, we can retrieve it:

```bash
$ cognitocurl --cognitoclient <COGNITO_USER_POOL_CLIENT> --userpool <COGNITO_USER_POOL> --run "curl -X GET $api_url'credentials'"
```

## Resources

[AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)

[cognitocurl](https://github.com/nordcloud/cognitocurl)