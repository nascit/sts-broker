'use strict';

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.TEAM_PREFERENCES_TABLE;

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async (event) => {
  console.log(event);

  var params = {
    TableName : tableName,
    Key: { team_id: event.requestContext.authorizer.claims['custom:team'] },
  };
  const data = await docClient.get(params).promise();
  const item = data.Item.policies;

  const response = {
    statusCode: 200,
    body: JSON.stringify(item)
  };

  return response;
}