'use strict';

const aws = require('aws-sdk');
const sns = new aws.SNS();

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

function get_permissions(inline_policy) {
    var permissions = "";
    inline_policy.forEach(function(value) {
        permissions += "=> Action: " + value.Action + "\n" +
            "     Resource: " + value.Resource + "\n";
    });
    return permissions + "\n";
}

exports.lambdaHandler = async(event, context, callback) => {

    console.log("Manual approval needed. Sending request to " + process.env.APPROVAL_SNS_TOPIC);

    // Send message to SNS topic

    const broker_policy = event.permission_request.policy;

    var params = {
        TableName: process.env.POLICIES_TABLE,
        Key: { policy_id: broker_policy },
    };
    var data = await docClient.get(params).promise();
    const policy = data.Item;

    var params = {
        Subject: '[STS Broker] Permissions request for approval',
        MessageAttributes: {
            policy_id: {
                DataType: 'String',
                StringValue: broker_policy
            },
            channel: {
                DataType: 'String',
                StringValue: policy.preferred_channel
            },
            slack_webhook_url: {
                DataType: 'String',
                StringValue: policy.slack_webhook_url
            }
        },
        Message: 'Hello Admin, \n\n' +
            'An user has requested permissions. \n\n' +
            'STS Broker policy: \n\n' +
            event.permission_request.policy +
            '\n\nFederated user e-mail : ' + JSON.stringify(event.permission_request.email) +
            '\n\nPlease, approve by clicking the below URL.\n\n' +
            process.env.APPROVAL_URL + '?requestid=' + event.permission_request.requestid + '&userid=' + event.permission_request.userid +
            '\n\nPlease ignore if you dont want to grant permissions to this user.\n' +
            'Thanks,\n' +
            'Approval Team\n',
        TopicArn: process.env.APPROVAL_SNS_TOPIC
    };

    await sns.publish(params).promise();

    const response = {
        message: "Security admin was notified."
    };

    return response;
};
