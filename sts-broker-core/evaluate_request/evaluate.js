'use strict';

const aws = require('aws-sdk');

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async(event, context, callback) => {

    // Sample business logic to decide whether this permission request should be automatically approved or not.

    var params = {
        TableName: process.env.POLICIES_TABLE,
        Key: { policy_id: event.permission_request.policy },
    };
    const data = await docClient.get(params).promise();
    const policy_risk = data.Item.risk;

    var approved;
    if (policy_risk > 50) {
        console.log("Manual approval required");
        approved = false;
    }
    else {
        console.log("Permission request is approved");
        approved = true;
    }

    const response = {
        automated_approval: approved
    };

    return response;
};
