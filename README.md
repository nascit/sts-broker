# sts-broker

This project can be used as a reference for a serverless custom Identity Broker architecture.

- Why would you need a Identity Broker?
    - Flexibility to manage permissions used among IAM roles/users.
    - Limit of how many IAM roles/users an AWS account can have.
    - Record every permission request made (traceability).
    - Least privilege access: Avoid sharing same permissions among federated users.
    - Implement a strong identity foundation.
    - More details on this Re:Invent session: 
    [![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/vbjFjMNVEpc/0.jpg)](https://www.youtube.com/watch?v=vbjFjMNVEpc&t=420s)
    

## Architecture

![STS Broker Architecture](https://github.com/nascit/sts-broker/raw/master/STSBroker.png "STS Broker architecture")

## Deploy the sample application

For each nested SAM application, use 'sam build' to build your Lambda source code and generate deployment artifacts that target Lambda's execution environment.

```bash
$ sam build
```

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

### Populate team preferences table:

Your 'team_preferences' table must have the following attributes:

- team_id (Partition Key):  A unique ID for the team the federated user belongs to. This must be available on the user ID token. User Pool has a custom attribute named 'team'.

- preferred_channel: If manual approval is needed, where to contact the security admin (email or slack).

    - If preferred_channel is 'email' but there is no email defined for this team, we will send the notification for the e-mail passed on the DefaultSecurityAdminEmailID parameter.

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

- policies: List of STS Broker policies defined on the policies table.

### Populate 'policies' table:
     
Your 'policies' table must have the following attributes:

policy_id (Partition key): A unique ID to uniquely identity this STS Broker policy.

base_role: The IAM Role members of this team will be able to assume. This role must include Lambda execution role in its Trust Relationship.

  - Example:
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

    - Lambda function execution role can be retrieved with the following command:

    ```bash
    aws cloudformation describe-stacks --stack-name <CFN_STACK_NAME> --query "Stacks[0].Outputs[?OutputKey=='ApproveRequestFunctionRoleARN'].OutputValue" --output text --region AWS_REGION --profile <PROFILE>)
    ```


account: AWS account number related to this policy.

default_tags: List of key-value pair for pre defined tags. When using this policy, these tags will always be passed to the AssumeRole API.

user_tags: Tags we need to retrieve from user claims. Eg.: "admin" tag should be false if it's a normal user.

description: Brief STS Broker policy description.

managed_policies: List of IAM managed policies to be passed on the AssumeRole API. (up to 10 managed policies)

* **Example of a STS Broker policy:** 

    ```bash
    {
      "account": "XXXXXXXXX",
      "base_role": "arn:aws:iam::XXXXXXX:role/DefaultAssumedRole",
      "default_tags": [
        {
          "environment": "development"
        },
        {
          "region": "us-east-2"
        }
      ],
      "description": "This policy will give access to MyApp development environment.",
      "managed_policies": [
        "arn:aws:iam::XXXXXXXXXX:policy/MyCustomManagedPolicy"
      ],
      "policy_id": "MyApp dev",
      "user_tags": [
        "admin"
      ]
    }
    ```

### Use your own permission request evaluation logic:

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

If you do not provide your custom permission request evaluation code, a default one (which relies on STS Broker policy risk value) will be used.

## Invoke STS Broker

Ideally you should use [STS Broker CLI](https://www.npmjs.com/package/stsbroker "STS Broker CLI") to interact with your custom identity broker.

You also have the option to make direct requests.

We first need to get the API URL created:

```bash
$ export api_url=$(aws cloudformation describe-stacks --stack-name <CFN_STACK_NAME> --query "Stacks[0].Outputs[?OutputKey=='STSBrokerAPI'].OutputValue" --output text --region AWS_REGION --profile <PROFILE>)
```

And the Cognito UserPool ID/ Client App ID:

```bash
$ export user_pool_id=$(aws cloudformation describe-stacks --stack-name <CFN_STACK_NAME> --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolID'].OutputValue" --output text --region AWS_REGION --profile <PROFILE>)
$ export user_pool_client_id=$(aws cloudformation describe-stacks --stack-name <CFN_STACK_NAME> --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolClientID'].OutputValue" --output text --region AWS_REGION --profile <PROFILE>)
```

The policy request will have the following parameters on the request body:

- policy
- sessionDuration

Now we can call the request permission API using 'cognitocurl' CLI tool:

```bash
$ cognitocurl --cognitoclient <COGNITO_USER_POOL_CLIENT> --userpool <COGNITO_USER_POOL> --run "curl -X POST $api_url'credentials/request' -H 'content-type: application/json' --data <request_body>"
```

Once permissions are approved by security admin, we can retrieve it:

```bash
$ cognitocurl --cognitoclient <COGNITO_USER_POOL_CLIENT> --userpool <COGNITO_USER_POOL> --run "curl -X GET $api_url'credentials'"
```

## Resources

[AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)

[cognitocurl](https://github.com/nordcloud/cognitocurl)