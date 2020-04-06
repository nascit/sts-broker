## Data modeling guide

### Team preferences format

Your 'team_preferences' table must have the following attributes:

- team_id (Partition Key):  A unique ID for a team the federated user belongs to. This must be available on the user ID token. User Pool has a custom attribute named 'teams'.

- policies: List of STS Broker policies defined on the policies table.

#### Example of a team_preferences item:

    {
      "policies": [
        {
          "description": "This policy will give access to MyApp development environment.",
          "id": "MyAppDev"
        },
        {
          "description": "This policy will give access to MyApp production environment.",
          "id": "MyAppProd"
        }
      ]
      "team_id": "MyApp"
    }


### Policy document format

Here we introduce the concept of a STS Broker policy. Different from a standard IAM Policy, the STS Broker policy will be a combination of IAM managed policies passed to a STS AssumeRole API call together with tags. Depending on the risk attribute of a STS Broker policy, it will only be available under manual permission request approval.

Your 'policies' table must have the following attributes:

- policy_id (Partition key): ID to uniquely identity this STS Broker policy.

- base_role: The IAM role to be assumed. This base IAM role will be more permissive as we will apply fine-grained permissions on the IAM managed policies passed to the session.

    - This role **must** include Lambda (ApproveRequestFunction) execution role in its Trust Relationship:
         
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
              
    - 'ApproveRequestFunctionRoleARN' is a output of the CloudFormation stack.

        - Lambda function execution role can be retrieved with the following command:

                $ aws cloudformation describe-stacks --stack-name <CFN_STACK_NAME> --query "Stacks[0].Outputs[?OutputKey=='ApproveRequestFunctionRoleARN'].OutputValue" --output text --region AWS_REGION --profile <PROFILE>)
       
- account: AWS account number related to this policy.

- default_tags: List of key-value pair for pre defined tags. When using this policy, these tags will always be passed to the AssumeRole API.

- user_tags: Tags we need to retrieve from user claims/attributes. Eg.: "admin" tag should be false if it's a normal user. These user tags will be based on user custom attributes.

- description: Brief STS Broker policy description.

- risk: A value (from 1-100) which represents the security risk associated with the policy.

- managed_policies: List of IAM managed policies to be passed on the AssumeRole API. (up to 10 managed policies)

    - Ideally, these managed policies should use **Conditions** to rely on session tags. Eg.:
    
            "Condition": {
                "StringEquals": {
                    "ec2:ResourceTag/environment": "${aws:PrincipalTag/environment}",
                    "ec2:ResourceTag/region": "${aws:PrincipalTag/region}"
                }
            }
    

- preferred_channel: If manual approval is needed, this is where the security admin associated with this policy will be contacted (email, slack or default).

    - If preferred_channel is 'default', the notification will be sent for the e-mail passed on the DefaultSecurityAdminEmailID parameter.
    
    - If preferred_channel is 'email', the table attribute 'admin_email' must be defined.
    
    - If preferred_channel is 'slack', the table attribute 'slack_webhook_url' must be defined.

- admin_email: Security admin e-mail if preferred channel is 'email'. If this is defined on the policies table, we also need to create a subscription on the SNS topic with the following subscription filter policy:

        {
          "channel": [
            "email"
          ],
          "policy": [
            "<POLICY_ID>"
          ]
        }
  - [Subscribe an Endpoint to an Amazon SNS Topic Using the AWS Management Console](https://docs.aws.amazon.com/sns/latest/dg/sns-tutorial-create-subscribe-endpoint-to-topic.html#create-subscribe-endpoint-to-topic-aws-console)
  
- slack_webhook_url: Slack channel webhook URL if preferred channel is 'slack'.


#### Example of a policy:

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
      "risk": 30,
      "admin_email": "admin@domain.com",
      "preferred_channel": "default",
      "slack_webhook_url": "https://hooks.slack.com/services/XXXX",
      "user_tags": [
        "admin"
      ]
    }

