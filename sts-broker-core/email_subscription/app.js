'use strict';

const AWS = require('aws-sdk');

var sns = new AWS.SNS();
var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

exports.lambdaHandler = async (event, context, callback) => {

    try {
        // Check if user already have a subscription
        var params = {
          UserPoolId: event.userPoolId,
          Username: event.userName
        };
        var user = await cognitoidentityserviceprovider.adminGetUser(params).promise();

        var subscription_exists;

        await asyncForEach(user.UserAttributes, async(attribute) => {
            console.log(attribute);
            if (attribute.Name == "custom:subscription_arn") {
                console.log("Subscription already exists for this user");
                subscription_exists = true;
            }
        });

        // Create a E-mail subscription if does not exist

        console.log("Create a E-mail subscription if does not exist");
        if (!subscription_exists) {
            var filter_policy = { "channel": ["email"], "event": ["permission_approval"], "user_id": [event.request.userAttributes.sub] };

            var params = {
              Protocol: 'email',
              TopicArn: process.env.USER_NOTIFICATION_TOPIC,
              Attributes: {
                'FilterPolicy': JSON.stringify(filter_policy),
              },
              Endpoint: event.request.userAttributes.email,
              ReturnSubscriptionArn: true
            };

            var subscription = await sns.subscribe(params).promise();

            if (subscription.SubscriptionArn) {
                // Update user 'subscription_arn' attribute
                var params = {
                  UserAttributes: [
                    {
                      Name: 'custom:subscription_arn',
                      Value: subscription.SubscriptionArn
                    }
                  ],
                  UserPoolId: event.userPoolId,
                  Username: event.userName
                };
                await cognitoidentityserviceprovider.adminUpdateUserAttributes(params).promise();
            }
        }
        callback(null, event);

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