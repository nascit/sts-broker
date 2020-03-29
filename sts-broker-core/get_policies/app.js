'use strict';

const AWS = require('aws-sdk');
const team_preferences_table = process.env.TEAM_PREFERENCES_TABLE;
const policies_table = process.env.POLICIES_TABLE;

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();
const JSONparser = require('really-relaxed-json');

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

exports.lambdaHandler = async(event, context, callback) => {

    try {
        var parser = JSONparser.createParser();

        var json = parser.stringToValue(event.requestContext.authorizer.claims['custom:teams']);

        var teams = JSON.parse(json.toString());

        if (!event.requestContext.authorizer.claims['custom:teams']) {
            errorResponse('User does not belong to any team.', context.awsRequestId, callback);
            return;
        }

        var keys = [];

        console.log("User belong to the following teams: " + teams);

        await asyncForEach(teams, async(team) => {
            var params = {
                TableName: team_preferences_table,
                Key: { team_id: team },
            };
            const data = await docClient.get(params).promise();

            if (data.Item) {
                const policies = data.Item.policies;

                policies.forEach(function(policy) {
                    keys.push({ policy_id: policy.id });
                });
            }

        });

        const unique_keys = [];
        const map = new Map();
        for (const item of keys) {
            if(!map.has(item.policy_id)){
                map.set(item.policy_id, true);
                unique_keys.push({
                    policy_id: item.policy_id
                });
            }
        }

        var policy_param = {};
        policy_param[policies_table] = { "Keys": unique_keys };

        var params = {
            RequestItems: policy_param
        };

        const policies_data = await docClient.batchGet(params).promise();
        console.log(policies_data.Responses.policies);

        const response = {
            statusCode: 200,
            body: JSON.stringify(policies_data.Responses.policies)
        };

        return response;
    } catch (error) {
        errorResponse(error.message, context.awsRequestId, callback);
    }

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