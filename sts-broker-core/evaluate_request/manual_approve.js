'use strict';

const aws = require('aws-sdk');
const sns = new aws.SNS();

function get_permissions (inline_policy) {
    var permissions = "";
    inline_policy.forEach(function(value){
//      console.log(value);
      permissions += "=> Action: " + value.Action + "\n" +
      "     Resource: " + value.Resource + "\n";
    });
    return permissions + "\n";
}

exports.lambdaHandler = async (event, context, callback) => {

    console.log("Manual approval needed. Sending request to " + process.env.APPROVAL_SNS_TOPIC);

    // Send message to SNS topic

    var params = {
        Subject:'Permissions request for approval',
        MessageAttributes: {
            team: {
                DataType: 'String',
                StringValue: event.team.team_id
            },
            channel: {
                DataType: 'String',
                StringValue: event.team.preferred_channel
            }
        },
        Message:'Hello Admin, \n\n' +
            'An user has requested permissions. \n\n' +
            'Inline Policy: \n\n' +
            get_permissions(event.permission_request.inline_policy) +
            'Managed policy ARNs: \n\n' +
            event.permission_request.policyARNs +
            '\n\nFederated user e-mail : ' + JSON.stringify(event.permission_request.email) +
            '\n\nPlease, approve by clicking the below URL.\n\n'+
            process.env.APPROVAL_URL + '?requestid=' +  event.permission_request.requestid + '&userid=' +  event.permission_request.userid +
            '\n\nPlease ignore if you dont want to grant permissions to this user.\n' +
            'Thanks,\n' +
            'Approval Team\n',
        TopicArn: process.env.APPROVAL_SNS_TOPIC
    };

    var published = await sns.publish(params).promise();

    const response = {
        message: "Security admin was notified."
    };

    return response;
};