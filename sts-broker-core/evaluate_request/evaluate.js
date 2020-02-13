'use strict';

const aws = require('aws-sdk');

exports.lambdaHandler = async (event, context, callback) => {

    // TODO: Sample business logic to decide whether this permission request should be automatically approved or not.

    console.log(event);

    if (event.permission_request.team == "myteam") {
        console.log("Manual approval needed");
        var approved = false;
    } else {
        console.log("Permission request is approved");
        var approved = true;
    }

    const response = {
        automated_approval: approved
    };

    return response;
};