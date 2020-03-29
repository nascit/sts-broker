'use strict';

exports.handler = async (event, context, callback) => {
    console.log(event["Records"][0]["Sns"]);

    // TODO: Notify user via slack

    console.log(event["Records"][0]["Sns"]);

}