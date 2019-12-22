'use strict';

const aws = require('aws-sdk');
const sns = new aws.SNS();
var docClient = new aws.DynamoDB.DocumentClient();
var dynamodbTranslator = docClient.getTranslator();

var ItemShape = docClient.service.api.operations.getItem.output.members.Item;

function get_permissions (permissions_requested) {
    var permissions = "";
    permissions_requested.forEach(function(value){
      console.log(value);
      permissions += "=> Action: " + value.Action + "\n" +
      "     Resource: " + value.Resource + "\n";
    });
    return permissions + "\n";
}

module.exports.lambdaHandler = (event, context, callback) => {

    event.Records.forEach((record) => {
        console.log(record);
        if (record.eventName == "INSERT") {

            var request = dynamodbTranslator.translateOutput(record.dynamodb.NewImage, ItemShape);
            console.log('DynamoDB Record: %j', request);
            if (request.approved) {
                console.log("Permission request is already approved");
                // TODO: Notify user the permission is already approved.
            } else {
                console.log("Permission request still not approved.");
                console.log("Sending request to " + process.env.APPROVAL_SNS_TOPIC);

                var params = {
                    Subject:'Permissions request for approval',
                    Message:'Hello Admin, \n\n' +
                        'An user has requested permissions to: \n\n' +
                        get_permissions(request.permissions_requested) +
                        'End-user e-mail : ' + JSON.stringify(request.email) +
                        '\n\nPlease, approve by clicking the below URL.\n\n'+
                        process.env.APPROVAL_URL + '?requestid=' +  request.requestid + '&userid=' +  request.userid +
                        '\n\nPlease ignore if you dont want to grant permissions to this user.\n' +
                        'Thanks,\n' +
                        'Approval Team\n',
                    TopicArn: process.env.APPROVAL_SNS_TOPIC
                };

                sns.publish(params, function (err, data) {
                    if(err) {
                        console.error('Error publishing to SNS');
                        console.log(err);
                    } else {
                        console.info('Message published to SNS');
                    }
                });
            }

        };

    });

    const response = {
        'statusCode': 200,
        'body': JSON.stringify({
            message: 'hello world',
        })
    };

    return response;
};