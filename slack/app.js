'use strict';

const { IncomingWebhook } = require('@slack/webhook');

// Read a url from the environment variables
// TODO: Get slack URL from TEAM_PREFERENCES_TABLE DynamoDB table
const url = process.env.SLACK_WEBHOOK_URL;

// Initialize
const webhook = new IncomingWebhook(url);

exports.handler = async (event, context, callback) => {
      console.log(event["Records"][0]["Sns"]["Message"]);
      await webhook.send({
        text: event["Records"][0]["Sns"]["Message"],
        unfurl_links: false,
        unfurl_media: false
      });

}