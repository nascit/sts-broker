'use strict';

const uuid = require('uuid');

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async (event, context, callback) => {
//    console.info('received:', event);

    if (!event.requestContext.authorizer) {
        errorResponse('Authorization not configured.', context.awsRequestId, callback);
        return;
    }

//    console.log(event.requestContext.authorizer.claims);

    var policy = JSON.parse(event.body);

    var userid = event.requestContext.authorizer.claims.sub;
    var permissions_requested = policy.Statement;

    console.log(permissions_requested);

    var params = {
        TableName: process.env.REQUESTS_TABLE,
        Item: {
            requestid: uuid.v1(),
            userid: userid,
            email: event.requestContext.authorizer.claims.email,  // Retrieve user info from JWT token
            team: event.requestContext.authorizer.claims['custom:team'],
            permissions_requested: permissions_requested,
            timestamp: new Date().getTime()
        },
    };

    const result = await docClient.put(params).promise();

    const response = {
        statusCode: 200,
        body: "Permission request made by user '" + userid + "'. Please allow some time until the security admin evaluates it.\n"
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