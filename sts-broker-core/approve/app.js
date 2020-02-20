'use strict';

const aws = require('aws-sdk');
var sts = new aws.STS();
var lambda = new aws.Lambda();

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async (event, context, callback) => {

    // STEP 1 - Map the policy from the requests table to be passed on the assumeRole API call

    var params = {
        TableName: process.env.REQUESTS_TABLE,
        Key: {
            requestid: event.queryStringParameters.requestid,
            userid: event.queryStringParameters.userid
        }
    };

    var permission_request = await docClient.get(params).promise();

    if (!permission_request.Item) {
        errorResponse('This permission request could not be found!', context.awsRequestId, callback);
        return;
    }

    // Get inline policy requested (if passed)

    var statements = [];
    if (permission_request.Item.inline_policy) {
        permission_request.Item.inline_policy.forEach(function(value){
            var statement = {
                "Effect": "Allow",
                "Action": value.Action,
                "Resource": value.Resource
            };
            statements.push(statement);
        });
    }

    const policy = {
      "Version": "2012-10-17",
      "Statement": statements
    };

    // Get managed policies requested (if passed)

    var managed_policies = [];
    if (permission_request.Item.policyARNs) {
        permission_request.Item.policyARNs.forEach(function(policy_arn){
            var arn = {
                arn: policy_arn
            };
            managed_policies.push(arn);
        });
    }

    // Get tags (if passed)

    var tags = []
    if (permission_request.Item.tags) {
        permission_request.Item.tags.forEach(function(tag){
            var tag = {
                Key: tag["Key"],
                Value: tag["Value"]
            }
            tags.push(tag);
        });
    }

    // STEP 2 - Get role association based on user info from 'team_preferences' table

    var team = permission_request.Item.team;

    var params = {
        TableName: process.env.TEAM_PREFERENCES_TABLE,
        Key: {
            team_id: team
        }
    };

    var team_info = await docClient.get(params).promise();

    // If team does not have a IAM role associated, use DEFAULT_ASSUMED_ROLE

    var role_assumed = (!team_info.Item.role)? process.env.DEFAULT_ASSUMED_ROLE: team_info.Item.role;

    // STEP 3 - ASSUME ROLE

    var params = {
        DurationSeconds: permission_request.Item.sessionDuration, // Default value is one hour
        Policy: (statements.length == 0)? null: JSON.stringify(policy),
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
        TableName : process.env.TEMP_CREDENTIALS_TABLE,
        Item: {
            userid : event.queryStringParameters.userid,
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
          <h1>Permission request approved</h1>
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