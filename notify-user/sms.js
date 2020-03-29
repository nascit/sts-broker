'use strict';

const aws = require('aws-sdk');
var sns = new aws.SNS({apiVersion: '2010-03-31', region: 'us-east-1'});

var params = {
  attributes: {
    'DefaultSenderID': 'STS Broker',
    'DefaultSMSType': 'Transactional'
  }
};
sns.setSMSAttributes(params, function(err, data) {
    if (err) console.log(err, err.stack);
    else     console.log(data);
});

exports.handler = (event, context, callback) => {

    // Notify user through SMS

    var params = {
        Message: event["Records"][0]["Sns"]["Message"],
        PhoneNumber: event["Records"][0]["Sns"]["MessageAttributes"]["target"]["Value"],
        Subject: 'AWS Permission request'
    };
    sns.publish(params, function(err, data) {
        if (err) console.log(err, err.stack);
        else     console.log(data);
    });
}