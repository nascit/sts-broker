'use strict';

const aws = require('aws-sdk');
var sts = new aws.STS();

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async (event) => {

    // STEP 1 - Map the policy from the requests table to be passed on the assumeRole API call

    var params = {
        TableName: process.env.REQUESTS_TABLE,
        Key: {
            requestid: event.queryStringParameters.requestid,
            userid: event.queryStringParameters.userid
        }
    };

    var permission_request = await docClient.get(params).promise();

    // Get inline policy requested

    var statements = []
    permission_request.Item.inline_policy.forEach(function(value){
        var statement = {
            "Effect": "Allow",
            "Action": value.Action,
            "Resource": value.Resource
        }
        statements.push(statement)
    });

    const policy = {
      "Version": "2012-10-17",
      "Statement": statements
    };

    // Get managed policies requested

    var managed_policies = []
    permission_request.Item.policyARNs.forEach(function(policy_arn){
        var arn = {
            arn: policy_arn
        }
        managed_policies.push(arn);
    });

    // Get tags passed

    var tags = []
    permission_request.Item.tags.forEach(function(tag){
        var tag = {
            Key: tag["Key"],
            Value: tag["Value"]
        }
        tags.push(tag);
    });

    // STEP 2 - Get role association based on user info from 'team_preferences' table

    var team = permission_request.Item.team;

    var params = {
        TableName: process.env.TEAM_PREFERENCES_TABLE,
        Key: {
            team_id: team
        }
    };

    var team_info = await docClient.get(params).promise();

    var role_assumed = team_info.Item.role;

    // TODO: If team does not have a IAM role associated, use DEFAULT_ASSUMED_ROLE

    // STEP 3 - ASSUME ROLE

    var params = {
        DurationSeconds: 3600, // TODO: Session duration can also be a parameter
        Policy: JSON.stringify(policy),
        PolicyArns: managed_policies,
        Tags: tags,
        RoleArn: role_assumed,
        RoleSessionName: event.queryStringParameters.userid
    };
    const creds = await sts.assumeRole(params).promise();

    // STEP 4 - Stores temporary credentials on TEMP_CREDENTIALS_TABLE table

    var params = {
        TableName : process.env.TEMP_CREDENTIALS_TABLE,
        Item: {
            userid : event.queryStringParameters.userid,
            credentials: creds.Credentials,
            expiration: new Date(creds.Credentials.Expiration).getTime() / 1000
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

    const response = {
        'statusCode': 200,
        'body': JSON.stringify({
            message: 'Permissions granted successfully.',
            requestid: event.queryStringParameters.requestid
        })
    }

    return response;
};
