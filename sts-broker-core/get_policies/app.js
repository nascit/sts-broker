'use strict';

const AWS = require('aws-sdk');
const team_preferences_table = process.env.TEAM_PREFERENCES_TABLE;
const policies_table = process.env.POLICIES_TABLE;

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async(event, context, callback) => {

    if (!event.requestContext.authorizer.claims['custom:team']) {
        errorResponse('User does not belong to any team.', context.awsRequestId, callback);
        return;
    }

    var params = {
        TableName: team_preferences_table,
        Key: { team_id: event.requestContext.authorizer.claims['custom:team'] },
    };
    const data = await docClient.get(params).promise();
    const policies = data.Item.policies;

    var keys = [];
    policies.forEach(function(policy) {
        keys.push({ policy_id: policy.id });
    });

    var policy_param = {};
    policy_param[policies_table] = { "Keys": keys };

    var params = {
        RequestItems: policy_param
    };

    console.log(params);

    const policies_data = await docClient.batchGet(params).promise();
    console.log(policies_data.Responses.policies);

    // TODO: Send more data by querying POLICIES_TABLE

    const response = {
        statusCode: 200,
        body: JSON.stringify(policies_data.Responses.policies)
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
