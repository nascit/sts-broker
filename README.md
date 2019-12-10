# sts-broker

This project can be used as a reference for a serverless Identity Broker architecture.

- Why would you need a Identity Broker?
    - Limit of how many IAM roles/users an AWS account can have.
    - Make it easier to manage permissions used among IAM roles/users.
    - Allow to register every permission request made (traceability).
    - Least privilege access: Avoid sharing same permissions among federated users.
    - Dynamic permissions
    - Implement a strong identity foundation


## Architecture

![Alt text](STSBrokerArchitecture.png?raw=true "STS Broker architecture")

1. Federated user invokes STS broker requesting specific permissions (passing JWT token)
2. Invoked Lambda stores the permission request on a DynamoDB table (Permissions Request Table)
3. For new request records ("Approval" field/attribute not present), DynamoDB streams will invoke a Lambda function which will 
    validate the permission request and send an "Approval URL" to an SNS topic
4. Different subscribers will process the SNS message and send to the appropriate channel (Slack, Chime, E-mail)
    * SNS component can be replaced by a Event Bridge rule
5. Security admin clicks the "Approval URL" and invokes the Lambda function which will assume the proper role.
6. Invoked Lambda function will:

    a. Check on a DynamoDB table (Role Association table) the proper role to assume based on user info (Squad + Chapter)
    
    b. Invoke AssumeRole API passing an inline policy based on the user permission request
    
    c. Stores temporary credentials on a DynamoDB table (Temporary Credentials table) with TTL configured
    
    d. Update Permission request table to reflect the approval event
7. User is notified about the approval status by subscribing to an SNS topic (Lambda checks for "Approval" field/attribute).
8. User invokes STS broker API to retrieve the temporary credentials

## Deploy the sample application


To prepare the application for deployment, use the `sam package` command.

```bash
$ sam package --output-template-file packaged.yaml --s3-bucket BUCKET_NAME --region AWS_REGION
```

The SAM CLI creates deployment packages, uploads them to the S3 bucket, and creates a new version of the template that refers to the artifacts in the bucket. 

To deploy the application, use the `sam deploy` command.

```bash
$ sam deploy --template-file packaged.yaml --stack-name sts-broker --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND --region AWS_REGION
```


## Invoke STS Broker

We first need to get the API URL created:

```bash
$ export api_url=$(aws cloudformation describe-stacks --stack-name sts-broker --query "Stacks[0].Outputs[?OutputKey=='STSBrokerApi'].OutputValue" --output text)
```

Now we can call the request permission API with:

```bash
$ curl $api_url'credentials/request'
```

Once permissions are approved by security admin, we can retrieve it:

```bash
$ curl $api_url'/credentials/get?userid=<USER_ID>'
```

## Resources

[AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)

[cognitocurl](https://github.com/nordcloud/cognitocurl)