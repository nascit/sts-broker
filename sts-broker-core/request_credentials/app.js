'use strict';

const uuid = require('uuid');

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async (event, context, callback) => {

    console.log(event.body);

    if (!event.requestContext.authorizer) {
        errorResponse('Authorization not configured.', context.awsRequestId, callback);
        return;
    }
    // TODO: User can also pass up to 10 managed policy ARNs

    // TODO: User can pass tags

    var inline_policy = JSON.parse(event.body).inline_policy;
    var policyARNs = JSON.parse(event.body).policyARNs;
    var tags = JSON.parse(event.body).tags;

    var userid = event.requestContext.authorizer.claims.sub;
    var inline_policy = inline_policy["Statement"];

    console.log("User has requested the following policies: ");
    console.log(inline_policy);
    console.log(policyARNs);

    console.log("Tags passed");
    console.log(tags);

    var params = {
        TableName: process.env.REQUESTS_TABLE,
        Item: {
            requestid: uuid.v1(),
            userid: userid,
            email: event.requestContext.authorizer.claims.email,  // Retrieve user info from JWT token
            team: event.requestContext.authorizer.claims['custom:team'],
            inline_policy: inline_policy,
            policyARNs: policyARNs,
            tags: tags,
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