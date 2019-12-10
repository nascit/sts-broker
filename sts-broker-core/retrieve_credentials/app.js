'use strict';

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.TEMP_CREDENTIALS_TABLE;

// Create a DocumentClient that represents the query to add an item
const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async (event) => {
  console.info('Received:', event);

  const userid = event.queryStringParameters.userid;

  if (userid == null) {
    const response = {
        statusCode: 200,
        body: ""
    };

    return response

  }

  var params = {
    TableName : tableName,
    Key: { userid: userid },
  };
  const data = await docClient.get(params).promise();
  const item = data.Item;

  const response = {
    statusCode: 200,
    body: JSON.stringify(item)
  };

//  console.info(`response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`);
  return response;
}