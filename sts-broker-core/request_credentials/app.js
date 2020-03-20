'use strict';

const uuid = require('uuid');

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

function removeEmptyStringElements(obj) {
    for (var prop in obj) {
        if (typeof obj[prop] === 'object') {
            removeEmptyStringElements(obj[prop]);
        }
        else if (obj[prop] === '') {
            delete obj[prop];
        }
    }
    return obj;
}

exports.lambdaHandler = async(event, context, callback) => {

    if (!event.body) {
        errorResponse('No permissions requested. You need to pass either a inline policy or a list of managed policies.', context.awsRequestId, callback);
        return;
    }

    if (!event.requestContext.authorizer.claims['custom:teams']) {
        errorResponse('User does not belong to any team.', context.awsRequestId, callback);
        return;
    }

    try {
        var inline_policy = JSON.parse(event.body).inline_policy;
        var broker_policy = JSON.parse(event.body).policy;
        var sessionDuration = JSON.parse(event.body).sessionDuration;
        var notificationChannel = JSON.parse(event.body).notificationChannel;
        var notificationTarget;

        if (notificationChannel == "sms") {
            notificationTarget = event.requestContext.authorizer.claims.phone_number
        } else if (notificationChannel == "email") {
            notificationTarget = event.requestContext.authorizer.claims.email
        } else if (notificationChannel == "slack") {
            notificationTarget = event.requestContext.authorizer.claims['custom:slack_channel']
        }

        // TODO: Validate inline policy if not empty.

        // TODO: Check if passed STS broker policy belong to the team allowed policies.

        var userid = event.requestContext.authorizer.claims.sub;
        inline_policy = (!inline_policy) ? "" : inline_policy["Statement"];

        console.log("User has requested the following policy: ");
        console.log(broker_policy);

        // Validate tags: Check if user has the attributes requited on user_tags

        var params = {
            TableName: process.env.POLICIES_TABLE,
            Key: { policy_id: broker_policy },
        };
        const data = await docClient.get(params).promise();
        const user_tags = data.Item.user_tags;
        const default_tags = data.Item.default_tags;

        var tags = [];

        if (user_tags && user_tags.length != 0) {
            user_tags.forEach(function(tag_name) {
                var custom_tag = 'custom:' + tag_name;
                var tag = {};
                if (event.requestContext.authorizer.claims[custom_tag]) {
                    tag[tag_name] = event.requestContext.authorizer.claims[custom_tag];
                }
                else if (event.requestContext.authorizer.claims.tag) {
                    tag[tag_name] = event.requestContext.authorizer.claims.tag;
                }
                else {
                    throw new Error("This user does not have the attribute '" + tag_name + "' which is required to use this policy.");
                }
                tags.push(tag);
            });
        }

        if (default_tags && default_tags.length != 0) {
            default_tags.forEach(function(tag) {
                tags.push(tag);
            });
        }

        var item = {
            requestid: uuid.v1(),
            userid: userid,
            email: event.requestContext.authorizer.claims.email,
            team: event.requestContext.authorizer.claims['custom:teams'],
            inline_policy: inline_policy,
            policy: broker_policy,
            tags: tags,
            sessionDuration: sessionDuration,
            notificationChannel: notificationChannel,
            notificationTarget: notificationTarget,
            timestamp: new Date().getTime()
        };

        var params = {
            TableName: process.env.REQUESTS_TABLE,
            Item: removeEmptyStringElements(item),
        };

        await docClient.put(params).promise();

        const response = {
            statusCode: 200,
            body: "Permission request made by user '" + userid + "' (" + event.requestContext.authorizer.claims.email + ") . Please allow some time until the security admin evaluates it.\n"
        };

        return response;
    } catch (error) {
        errorResponse(error.message, context.awsRequestId, callback);
    }

};

function errorResponse(errorMessage, awsRequestId, callback) {
    const resp = {
        statusCode: 500,
        body: errorMessage,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    };
    callback(null, resp);
}