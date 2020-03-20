'use strict';

const { IncomingWebhook } = require('@slack/webhook');

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.handler = async (event, context, callback) => {
    console.log(event["Records"][0]["Sns"]["MessageAttributes"]["team"]["Value"]);

    // Get slack webhook URL based on user info from 'team_preferences' table

    var team = event["Records"][0]["Sns"]["MessageAttributes"]["team"]["Value"];

    var params = {
        TableName: process.env.TEAM_PREFERENCES_TABLE,
        Key: {
            team_id: team
        }
    };

    var team_info = await docClient.get(params).promise();

    // If team does not have slack URL, thrown an error

    if (!team_info.Item.slack_webhook_url) {
        errorResponse('This team does not have a slack channel!', context.awsRequestId, callback);
        return;
    }

    const webhook = new IncomingWebhook(team_info.Item.slack_webhook_url);

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