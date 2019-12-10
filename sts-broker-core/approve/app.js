'use strict';

const aws = require('aws-sdk');
var sts = new aws.STS();

// Create a DocumentClient that represents the query to add an item
const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async (event) => {

    // event should contain permission requestid, token (to validate approval request)

    // TODO: STEP 1 - Get role association based on user info from 'role_mapping' table

    // STEP 2 - ASSUME ROLE
    var params = {
        DurationSeconds: 3600,
        Policy: "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"Stmt1\",\"Effect\":\"Allow\",\"Action\":\"s3:ListAllMyBuckets\",\"Resource\":\"*\"}]}",
        RoleArn: process.env.ASSUMED_ROLE,
        RoleSessionName: "MySession"
    };
    const creds = await sts.assumeRole(params).promise();

    console.log(creds.Credentials);

    // STEP 3 - Stores temporary credentials on TEMP_CREDENTIALS_TABLE table

    var params = {
        TableName : process.env.TEMP_CREDENTIALS_TABLE,
        Item: {
            userid : "userx", // get userid based on request id
            credentials: creds.Credentials,
            expiration: new Date(creds.Credentials.Expiration).getTime() / 1000
        }
    };

    const result = await docClient.put(params).promise();

    // STEP 4 - Update Permission request table to reflect the approval event

    const timestamp = new Date().getTime();

    var params = {
        TableName: process.env.REQUESTS_TABLE,
        Key: {
            requestid: event.queryStringParameters.requestid,
            userid: "xyz",
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
        })
    }

    return response;
};
