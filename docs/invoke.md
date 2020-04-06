## Invoke STS Broker

We strongly recommend you to use [STS Broker CLI](https://www.npmjs.com/package/stsbroker "STS Broker CLI") to interact with your custom identity broker. Please follow the instructions there to learn how to configure the CLI and perform the permission requests.

You also have the option to make direct requests.

We first need to get the API URL created:

    $ export api_url=$(aws cloudformation describe-stacks --stack-name <CFN_STACK_NAME> --query "Stacks[0].Outputs[?OutputKey=='STSBrokerAPI'].OutputValue" --output text --region AWS_REGION --profile <PROFILE>)

And the Cognito UserPool ID/ Client App ID:

    $ export user_pool_id=$(aws cloudformation describe-stacks --stack-name <CFN_STACK_NAME> --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolID'].OutputValue" --output text --region AWS_REGION --profile <PROFILE>)
    $ export user_pool_client_id=$(aws cloudformation describe-stacks --stack-name <CFN_STACK_NAME> --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolClientID'].OutputValue" --output text --region AWS_REGION --profile <PROFILE>)

The policy request will have the following parameters on the request body:

- policy
- sessionDuration
- notificationChannel

Now we can call the request permission API using 'cognitocurl' CLI tool:

    $ cognitocurl --cognitoclient <COGNITO_USER_POOL_CLIENT> --userpool <COGNITO_USER_POOL> --run "curl -X POST $api_url'credentials/request' -H 'content-type: application/json' --data <request_body>"

Once permissions are approved by security admin, we can retrieve it:

    $ cognitocurl --cognitoclient <COGNITO_USER_POOL_CLIENT> --userpool <COGNITO_USER_POOL> --run "curl -X GET $api_url'credentials'"