'use strict';

const AWS = require('aws-sdk');

const tableName = process.env.TEMP_CREDENTIALS_TABLE;

const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

exports.lambdaHandler = async(event) => {
  console.info('Received:', event);

  var params = {
    TableName: tableName,
    Key: { userid: event.requestContext.authorizer.claims.sub },
  };
  const data = await docClient.get(params).promise();
  const item = data.Item;

  const response = {
    statusCode: 200,
    body: JSON.stringify(item)
  };

  return response;
};

function errorResponse(errorMessage, awsRequestId, callback) {
  callback(null, {
    statusCode: 500,
    body: JSON.stringify({
      Error: errorMessage,
      Reference: awsRequestId,
    }),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
}
