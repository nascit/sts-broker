'use strict';

const { IncomingWebhook } = require('@slack/webhook');

exports.handler = async (event, context, callback) => {
    console.log(event["Records"][0]["Sns"]);

    // TODO: Notify user

    console.log(JSON.parse(event["Records"][0]["Sns"]["Message"]));

    console.log(event["Records"][0]["Sns"]["MessageAttributes"]);
}

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