'use strict';

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.TEAM_PREFERENCES_TABLE;

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async (event, context, callback) => {

    if (!event.requestContext.authorizer.claims['custom:team']) {
        errorResponse('User does not belong to any team.', context.awsRequestId, callback);
        return;
    }

    var params = {
        TableName : tableName,
        Key: { team_id: event.requestContext.authorizer.claims['custom:team'] },
    };
    const data = await docClient.get(params).promise();
    const item = data.Item.policies;

    const response = {
        statusCode: 200,
        body: JSON.stringify(item)
    };

    return response;
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