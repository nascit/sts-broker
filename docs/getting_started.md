# Getting started

## Deploy the STS Broker

### AWS Serverless Application Repository

This project is [available](https://serverlessrepo.aws.amazon.com/applications/arn:aws:serverlessrepo:us-east-1:355686237214:applications~STSBroker "STS Broker") on the [Serverless Application Respository](https://aws.amazon.com/pt/serverless/serverlessrepo/). Only 'sts-broker-core' is available on SAR. If you want to deploy the notification components (notify-user, notify-admin), use AWS SAM CLI.

### Using AWS SAM CLI

For each nested SAM application, use 'sam build' to build your Lambda source code and generate deployment artifacts that target Lambda's execution environment.

    $ sam build

To prepare the application for deployment, use the `sam package` command.

    $ sam package --output-template-file packaged.yaml --s3-bucket <BUCKET_NAME> --region <AWS_REGION> --profile <PROFILE>

The SAM CLI creates deployment packages, uploads them to the S3 bucket, and creates a new version of the template that refers to the artifacts in the bucket. 

To deploy the application, use the `sam deploy` command.

    $ sam deploy --template-file packaged.yaml --stack-name sts-broker --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND --region <AWS_REGION> --profile <PROFILE>


## Customize your Identity Broker

### How do I set up _______ as a federated identity provider in an Amazon Cognito user pool?

By using Cognito, you can setup your own OIDC/SAML/Social Identity Provider. Here are some guides you can follow:

[How do I set up a third-party SAML identity provider with an Amazon Cognito user pool?](https://aws.amazon.com/premiumsupport/knowledge-center/cognito-third-party-saml-idp/)

[How do I set up OneLogin as a SAML identity provider with an Amazon Cognito user pool?](https://aws.amazon.com/premiumsupport/knowledge-center/cognito-saml-onelogin/)

[How do I set up Okta as a SAML identity provider in an Amazon Cognito user pool?](https://aws.amazon.com/premiumsupport/knowledge-center/cognito-okta-saml-identity-provider/)

[How do I set up Google as a federated identity provider in an Amazon Cognito user pool?](https://aws.amazon.com/premiumsupport/knowledge-center/cognito-google-social-identity-provider/)

[How do I set up LinkedIn as a social identity provider in an Amazon Cognito user pool?](https://aws.amazon.com/premiumsupport/knowledge-center/cognito-linkedin-auth0-social-idp/)

[How do I set up Auth0 as a SAML identity provider with an Amazon Cognito user pool?](https://aws.amazon.com/premiumsupport/knowledge-center/auth0-saml-cognito-user-pool/)


### Map attributes from your Identity Provider

Your User Pool will need to have a couple of custom attributes populated. Most important one is **'custom:teams'**. This required custom attribute **must** contain a list of the groups/roles/teams your user belongs to. Based on this attribute, the STS Broker will list the policies available to this user.

You can follow these guides to map attributes from your IdP to your User Pool:

[Specifying Identity Provider Attribute Mappings for Your User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-specifying-attribute-mapping.html)

[Configuring Attribute Mapping for Your User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-attribute-mapping.html)


### Create base IAM Roles to be assumed

Each different STS Broker policy will have a base role. The broker uses this base IAM role to provide access to AWS resources. If you have permission to create IAM Policies and IAM Roles you can use the following guide to create an example base role:

1. Retrieve Lambda execution IAM role which will be assuming the base role.

    'ApproveRequestFunctionRoleARN' is a output of the CloudFormation stack. It can be retrieved with the following command:

        $ aws cloudformation describe-stacks --stack-name <CFN_STACK_NAME> --query "Stacks[0].Outputs[?OutputKey=='ApproveRequestFunctionRoleARN'].OutputValue" --output text --region AWS_REGION --profile <PROFILE>
    
2. Build the base role trust relationship policy JSON document.

    Save the following trust policy with the name trustpolicy.json:
    
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

3. Create a base IAM role.

        aws iam create-role --role-name <BASE_ROLE_NAME> --assume-role-policy-document file://trustpolicy.json --max-session-duration 43200

4. Attach a policy to your base role.

    \* For this example, we will create a role with 'AmazonSSMFullAccess' managed policy attached.

        aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/AmazonSSMFullAccess --role-name <BASE_ROLE_NAME>


### Create a STS Broker policy document

The next component required by the broker is a document detailing a policy which will be stored at the 'policies' table. Each STS Broker policy will have a single base role and up to 10 managed policies.

\* For more details on each attribute of a STS Broker policy document, check our [data modeling](data_model.md) documentation.

1. First step is to create a custom managed policy. This policy will be passed on the AssumeRole API call and should rely on attributes.

    Save the following policy with the name managedpolicy.json:
    
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "ssm:StartSession"
                    ],
                    "Resource": "*",
                    "Condition": {
                        "StringEquals": {
                            "ec2:ResourceTag/environment": "${aws:PrincipalTag/environment}",
                            "ec2:ResourceTag/region": "${aws:PrincipalTag/region}"
                        }
                    }
                }
            ]
        }

2. Create your custom managed IAM policy:

        aws iam create-policy --policy-name <POLICY_NAME> --policy-document file://managedpolicy.json
        
3. Now we need to create the DynamoDB table item.

    Save the following document with the name MyAppDev.json:
    
        {
          "account": {
            "S": "<AWS_ACCOUNT>"
          },
          "admin_email": {
              "S": "<ADMIN_EMAIL>"
          },
          "base_role": {
            "S": "<BASE_ROLE_ARN>"
          },
          "default_tags": {
            "L": [
              {
                "M": {
                  "environment": {
                    "S": "development"
                  }
                }
              },
              {
                "M": {
                  "region": {
                    "S": "us-east-2"
                  }
                }
              }
            ]
          },
          "description": {
            "S": "This policy will give access to MyApp development environment."
          },
          "managed_policies": {
            "L": [
              {
                "S": "<IAM_MANGED_POLICY_ARN>" // Created on the previous step.
              }
            ]
          },
          "policy_id": {
            "S": "MyAppDev"
          },
          "risk": {
            "N": "30"
          }
        }
        
4. Create the DDB item with the following command:

        aws dynamodb put-item --table-name policies --item file://MyAppDev.json --region <AWS_REGION>
        

### Create a team

1. Save the following document with the name MyAppTeam.json:

    {
      "policies": {
        "L": [
          {
            "M": {
              "description": {
                "S": "This policy will give access to MyApp development environment."
              },
              "id": {
                "S": "MyAppDev"
              }
            }
          }
        ]
      },
      "team_id": {
        "S": "MyApp"
      }
    }

2. Create the DDB item with the following command:

        aws dynamodb put-item --table-name team_preferences --item file://MyAppTeam.json --region <AWS_REGION>

### Make your first permission request

For more details, check [invoke](invoke.md) documentation.