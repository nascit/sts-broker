'use strict';

const aws = require('aws-sdk');

exports.lambdaHandler = async (event, context, callback) => {

    // Sample business logic to decide whether this permission request should be automatically approved or not.

    if (event.permission_request.inline_policy || event.permission_request.policyARNs.length > 5) {
        console.log("Manual approval required");
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