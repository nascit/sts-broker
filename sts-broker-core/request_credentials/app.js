'use strict';

const aws = require('aws-sdk');
//var sts = new aws.STS();
const uuid = require('uuid');

// Create a DocumentClient that represents the query to add an item
const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async (event) => {
    console.info('received:', event);

    var userid = "xyz";
    var permissions_requested = [
      {
        Action: "s3:GetObject",
        Resource: "arn:aws:s3:::wildrydes-nascit/*"
      },
      {
        Action: "sqs:*",
        Resource: "*"
      }
    ];

    var params = {
        TableName: process.env.REQUESTS_TABLE,
        Item: {
            requestid: uuid.v1(),
            userid: userid,
            email: "xyz@mycompany.com",  //Retrieve user info from JWT token
            squad: "XXX",
            chapter: "YYY",
            permissions_requested: permissions_requested,
            timestamp: new Date().getTime()
        },
    };

    const result = await docClient.put(params).promise();

    const response = {
        statusCode: 200,
        body: "Permission request made by user '" + userid + "'. Please allow some time until the security admin evaluates it.\n"
    };

    console.info(`response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`);
    return response;
}





//
//
//module.exports.lambdaHandler = (event, context) => {
//
////    console.log(process.env.REQUESTS_TABLE);
//
//    const timestamp = new Date().getTime();
//
//    const params = {
//        TableName: process.env.REQUESTS_TABLE,
//        Item: {
//            userid: uuid.v1(),
//            email: "xyz@mycompany.com",  //Retrieve user info from JWT token
//            squad: "XXX",
//            chapter: "YYY",
//            permissions_requested: [
//              {
//                Action: "s3:GetObject",
//                Resource: "arn:aws:s3:::wildrydes-nascit/*"
//              },
//              {
//                Action: "sqs:*",
//                Resource: "*"
//              }
//            ],
//            timestamp: timestamp
//        },
//    };
//
//    let dbPut = (params) => { return dynamo.put(params).promise() };
//
//    dbPut(params).then( (data) => {
//        console.log("PUT ITEM SUCCEEDED}");
////        callback(null, createResponse(200, null));
//    }).catch( (err) => {
//        console.log("PUT ITEM FAILED FOR");
//
//        console.log(err);
////        callback(null, createResponse(500, err));
//    });
//
////    try {
////        var params = {
////            DurationSeconds: 3600,
////            Policy: "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"Stmt1\",\"Effect\":\"Allow\",\"Action\":\"s3:ListAllMyBuckets\",\"Resource\":\"*\"}]}",
////            RoleArn: process.env.ASSUMED_ROLE,
////            RoleSessionName: "MySession"
////        };
////        sts.assumeRole(params, function (err, data) {
////            if (err) console.log(err, err.stack);
////            else     console.log(data);
////        });
////    } catch (err) {
////        console.log(err);
////        return err;
////    }
//
//    const response = {
//        'statusCode': 200,
//        'body': JSON.stringify({
//            message: 'hello world',
//        })
//    }
//
//    return response
//};
