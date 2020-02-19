'use strict';

const aws = require('aws-sdk');
const https = require('https');

exports.lambdaHandler = async (event, context, callback) => {

    console.log("Automatic approval. Sending request to the approval URL: " + process.env.APPROVAL_URL);

    var url = process.env.APPROVAL_URL + '?requestid=' +  event.permission_request.requestid + '&userid=' +  event.permission_request.userid;

    console.log(url);

    let dataString = '';

    const response = await new Promise((resolve, reject) => {
        const req = https.get(url, function(res) {
          res.on('data', chunk => {
            dataString += chunk;
          });
          res.on('end', () => {
            resolve({
                statusCode: 200,
                body: dataString
            });
          });
        });

        req.on('error', (e) => {
          reject({
              statusCode: 500,
              body: 'Something went wrong!'
          });
        });
    });

    return response;
};