'use strict';

const { IncomingWebhook } = require('@slack/webhook');

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.handler = async (event, context, callback) => {
    console.log(event["Records"][0]["Sns"]["MessageAttributes"]);

    // Get slack webhook URL

    if (!event["Records"][0]["Sns"]["MessageAttributes"]["slack_webhook_url"]["Value"]) {
        errorResponse('This policy does not have a slack channel associated!', context.awsRequestId, callback);
        return;
    }

    // If team does not have slack URL, thrown an error

    const webhook = new IncomingWebhook(event["Records"][0]["Sns"]["MessageAttributes"]["slack_webhook_url"]["Value"]);

    await webhook.send({
        text: event["Records"][0]["Sns"]["Message"],
        unfurl_links: false,
        unfurl_media: false
    });

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