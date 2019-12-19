'use strict';

//const aws = require('aws-sdk');
const uuid = require('uuid');

// Create a DocumentClient that represents the query to add an item
const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async (event, context, callback) => {
//    console.info('received:', event);

    if (!event.requestContext.authorizer) {
        errorResponse('Authorization not configured.', context.awsRequestId, callback);
        return;
    }

    let body = JSON.parse(event.body);

//    console.log(event.body);
//
//    console.log(event.requestContext.authorizer);

    var policy = JSON.parse(event.body);

    var userid = "xyz";
    var permissions_requested = policy.Statement;

    console.log(permissions_requested);

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