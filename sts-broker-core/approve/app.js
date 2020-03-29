'use strict';

const aws = require('aws-sdk');
var sts = new aws.STS();
var lambda = new aws.Lambda();

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async(event, context, callback) => {

    try {
        // STEP 1 - Map the STS Broker policy from the permission requests table

        var params = {
            TableName: process.env.REQUESTS_TABLE,
            Key: {
                requestid: event.queryStringParameters.requestid,
                userid: event.queryStringParameters.userid
            }
        };

        var data = await docClient.get(params).promise();
        const permission_request = data.Item;
        const broker_policy = permission_request.policy;

        if (!permission_request) {
            errorResponse('This permission request could not be found!', context.awsRequestId, callback);
            return;
        }

        var params = {
            TableName: process.env.POLICIES_TABLE,
            Key: { policy_id: broker_policy },
        };
        var data = await docClient.get(params).promise();
        const policy = data.Item;

        // Get managed policies requested (if passed)

        var managed_policies = [];
        if (policy.managed_policies) {
            policy.managed_policies.forEach(function(policy_arn) {
                var arn = {
                    arn: policy_arn
                };
                managed_policies.push(arn);
            });
        }

        // Get tags (if passed)

        var tags = [];
        if (permission_request.tags && permission_request.tags.length != 0) {
            permission_request.tags.forEach(function(tag) {
                var session_tag = {
                    Key: Object.keys(tag)[0],
                    Value: tag[Object.keys(tag)[0]]
                };
                tags.push(session_tag);
            });
        }

        // STEP 2 - Get IAM role to be assumed

        if (!policy.base_role) {
            errorResponse('This policy does not have a base role!', context.awsRequestId, callback);
        }
        var role_assumed = policy.base_role;

        // STEP 3 - ASSUME ROLE

        var params = {
            DurationSeconds: permission_request.sessionDuration,
            //        Policy: (statements.length == 0)? null: JSON.stringify(policy),
            PolicyArns: managed_policies,
            Tags: tags,
            RoleArn: role_assumed,
            RoleSessionName: event.queryStringParameters.userid
        };
        const creds = await sts.assumeRole(params).promise();

        // Invoke construct URL function.

        const lambdaParams = {
            FunctionName: process.env.CONSTRUCT_URL_FUNCTION,
            InvocationType: 'RequestResponse',
            LogType: 'Tail',
            Payload: {
                credentials: creds.Credentials
            }
        };

        lambdaParams.Payload = JSON.stringify(lambdaParams.Payload);

        const lambdaResult = await lambda.invoke(lambdaParams).promise();

        const resultObject = JSON.parse(lambdaResult.Payload);

        // STEP 4 - Stores temporary credentials on TEMP_CREDENTIALS_TABLE table

        var params = {
            TableName: process.env.TEMP_CREDENTIALS_TABLE,
            Item: {
                userid: event.queryStringParameters.userid,
                credentials: creds.Credentials,
                expiration: new Date(creds.Credentials.Expiration).getTime() / 1000,
                signin_url: resultObject.request_url
            }
        };

        const result = await docClient.put(params).promise();

        // STEP 5 - Update Permission request table to reflect the approval event

        const timestamp = new Date().getTime();

        var params = {
            TableName: process.env.REQUESTS_TABLE,
            Key: {
                requestid: event.queryStringParameters.requestid,
                userid: event.queryStringParameters.userid,
            },
            ExpressionAttributeValues: {
                ':approved': true,
                ':updatedAt': timestamp,
            },
            UpdateExpression: 'SET approved = :approved, updatedAt = :updatedAt',
            ReturnValues: 'ALL_NEW',
        };

        await docClient.update(params).promise();

        // Construct user response

        let message = `<p>Permission request ${event.queryStringParameters.requestid} was approved!</p>`;

        const html = `
          <html>
            <style>
              h1 { color: #73757d; }
            </style>
            <body>
              <h1>[STS Broker] Permission request approved</h1>
              ${message}
            </body>
          </html>`;

        const response = {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'text/html',
            },
            'body': html
        };

        return response;
    } catch (error) {
        errorResponse(error.message, context.awsRequestId, callback);
    }

};

function errorResponse(errorMessage, awsRequestId, callback) {
    callback(null, {
        statusCode: 500,
        body: JSON.stringify({
            Error: errorMessage,
            Reference: awsRequestId,
        }),
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    });
}