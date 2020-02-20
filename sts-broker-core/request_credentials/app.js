'use strict';

const uuid = require('uuid');

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

function removeEmptyStringElements(obj) {
    for (var prop in obj) {
        if (typeof obj[prop] === 'object') {
            removeEmptyStringElements(obj[prop]);
        } else if(obj[prop] === '') {
            delete obj[prop];
        }
    }
    return obj;
}

exports.lambdaHandler = async (event, context, callback) => {

    if (!event.body) {
        errorResponse('No permissions requested. You need to pass either a inline policy or a list of managed policies.', context.awsRequestId, callback);
        return;
    }

    if (!event.requestContext.authorizer.claims['custom:team']) {
        errorResponse('User does not belong to any team.', context.awsRequestId, callback);
        return;
    }

    var inline_policy = JSON.parse(event.body).inline_policy;
    var policyARNs = JSON.parse(event.body).policyARNs;
    var tags = JSON.parse(event.body).tags;
    var sessionDuration = JSON.parse(event.body).sessionDuration

    // TODO: Validate inline policy.

    if (policyARNs.length > 10) {
        errorResponse('You cannot pass more than 10 managed policies.', context.awsRequestId, callback);
        return;
    }

    // TODO: Check if passed managed policies belong to the team allowed policies.

    var userid = event.requestContext.authorizer.claims.sub;
    var inline_policy = (!inline_policy)? "": inline_policy["Statement"];

    console.log("User has requested the following policies: ");
    console.log(inline_policy);
    console.log(policyARNs);

    // TODO: Validate tags

    console.log("Tags passed:");
    console.log(tags);

    var item = {
        requestid: uuid.v1(),
        userid: userid,
        email: event.requestContext.authorizer.claims.email,  // Retrieve user info from JWT token
        team: event.requestContext.authorizer.claims['custom:team'],
        inline_policy: inline_policy,
        policyARNs: policyARNs,
        tags: tags,
        sessionDuration: sessionDuration,
        timestamp: new Date().getTime()
    }

    var params = {
        TableName: process.env.REQUESTS_TABLE,
        Item: removeEmptyStringElements(item),
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