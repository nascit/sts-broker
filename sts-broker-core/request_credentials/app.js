'use strict';

//const aws = require('aws-sdk');
const uuid = require('uuid');

// Create a DocumentClient that represents the query to add an item
const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async (event) => {
    console.info('received:', event);

    console.log(event.queryStringParameters.policy);

    var policy = JSON.parse(event.queryStringParameters.policy);

    console.log(policy);

    var userid = "xyz";
    var permissions_requested = policy.Statement;
//    var permissions_requested = [
//      {
//        Action: "s3:GetObject",
//        Resource: "arn:aws:s3:::sts-broker-test-access/*"
//      },
//      {
//        Action: "sqs:*",
//        Resource: "*"
//      }
//    ];

    var params = {
        TableName: process.env.REQUESTS_TABLE,
        Item: {
            requestid: uuid.v1(),
            userid: userid,
            email: "xyz@mycompany.com",  //Retrieve user info from JWT token
            squad: "XXX",
            chapter: "YYY",
            permissions_requested: permissions_requested,
            timestamp: new Date().getTime()
        },
    };

    const result = await docClient.put(params).promise();

    const response = {
        statusCode: 200,
        body: "Permission request made by user '" + userid + "'. Please allow some time until the security admin evaluates it.\n"
    };

    console.info(`response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`);
    return response;
};