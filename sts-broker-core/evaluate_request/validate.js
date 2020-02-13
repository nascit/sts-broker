'use strict';

const aws = require('aws-sdk');
const sns = new aws.SNS();
var docClient = new aws.DynamoDB.DocumentClient();
var dynamodbTranslator = docClient.getTranslator();

var stepFunctions = new aws.StepFunctions();

var ItemShape = docClient.service.api.operations.getItem.output.members.Item;

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
                console.log("Permission request is already approved. Sending notification to federated user...");
                // TODO: Notify user the permission is already approved.
            } else {
                console.log("Permission request still not approved.");

                // TODO: Validate permission request before sending to State machine.

                // Get user's team info

                var team = request.team;

                var params = {
                    TableName: process.env.TEAM_PREFERENCES_TABLE,
                    Key: {
                        team_id: team
                    }
                };

                var team_info = await docClient.get(params).promise();

                // Send request to the 'EvaluatePermissionRequest' state machine.

                var state_machine_input = {
                    permission_request: request,
                    team: team_info.Item
                };

                console.log("Executing 'EvaluatePermissionRequest' state machine execution for requestID " + request.requestid);
                var params = {
                    stateMachineArn: process.env.EVALUATE_REQUEST_STATE_MACHINE,
                    input: JSON.stringify(state_machine_input)
                };
                var execution = await stepFunctions.startExecution(params).promise();
                console.log(execution);
            }

        }

    });

};