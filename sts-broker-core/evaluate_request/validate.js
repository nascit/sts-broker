'use strict';

const aws = require('aws-sdk');
const sns = new aws.SNS();
var docClient = new aws.DynamoDB.DocumentClient();
var dynamodbTranslator = docClient.getTranslator();

var stepFunctions = new aws.StepFunctions();

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

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

exports.lambdaHandler = async (event, context, callback) => {

    await asyncForEach(event.Records, async (record) => {
        if (record.eventName == "INSERT") {

            var request = dynamodbTranslator.translateOutput(record.dynamodb.NewImage, ItemShape);
            console.log('Permission request: %j', request);
            if (request.approved) {
                console.log("Permission request is already approved");
                // TODO: Notify user the permission is already approved.
            } else {
                console.log("Permission request still not approved.");

                // TODO: Validate permission request before sending to State machine.

                // Send request to the 'EvaluatePermissionRequest' state machine.

                console.log("Executing 'EvaluatePermissionRequest' state machine execution for requestID " + request.requestid);
                var params = {
                    stateMachineArn: process.env.EVALUATE_REQUEST_STATE_MACHINE,
                    input: JSON.stringify(request)
                };
                var execution = await stepFunctions.startExecution(params).promise();
                console.log(execution);

//                 TODO: Evaluate if permission request needs manual approval. If not, automatically approve request.
//                console.log("Manual approval needed. Sending request to " + process.env.APPROVAL_SNS_TOPIC);
//
//                // Get user preferred channel
//
//                var team = request.team;
//
//                var params = {
//                    TableName: process.env.TEAM_PREFERENCES_TABLE,
//                    Key: {
//                        teamid: team
//                    }
//                };
//
//                var team_info = await docClient.get(params).promise();
//
//                var preferred_channel = team_info.Item.preferred_channel;
//
//                // Send SNS message
//
//                var params = {
//                    Subject:'Permissions request for approval',
//                    MessageAttributes: {
//                        channel: {
//                            DataType: 'String',
//                            StringValue: preferred_channel
//                        },
//                    },
//                    Message:'Hello Admin, \n\n' +
//                        'An user has requested permissions to: \n\n' +
//                        get_permissions(request.permissions_requested) +
//                        'End-user e-mail : ' + JSON.stringify(request.email) +
//                        '\n\nPlease, approve by clicking the below URL.\n\n'+
//                        process.env.APPROVAL_URL + '?requestid=' +  request.requestid + '&userid=' +  request.userid +
//                        '\n\nPlease ignore if you dont want to grant permissions to this user.\n' +
//                        'Thanks,\n' +
//                        'Approval Team\n',
//                    TopicArn: process.env.APPROVAL_SNS_TOPIC
//                };
//
//                let published = await sns.publish(params).promise();

            }

        }

    });

};