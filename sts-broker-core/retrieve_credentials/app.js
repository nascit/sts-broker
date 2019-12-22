'use strict';

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.TEMP_CREDENTIALS_TABLE;

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async (event) => {
  console.info('Received:', event);

  var params = {
    TableName : tableName,
    Key: { userid: event.requestContext.authorizer.claims.sub },
  };
  const data = await docClient.get(params).promise();
  const item = data.Item;

  const response = {
    statusCode: 200,
    body: JSON.stringify(item)
  };

  return response;
}