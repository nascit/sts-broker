'use strict';

const aws = require('aws-sdk');

exports.lambdaHandler = async (event, context, callback) => {

    // TODO: Automatic approval flow. Make a request to the APPROVAL_URL.

    console.log(event);

    console.log("Automatic approval. Sending request to the approval URL: " + process.env.APPROVAL_URL);
};