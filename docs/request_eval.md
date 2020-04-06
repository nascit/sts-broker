## Permission request evaluation

By default, the permission request evaluation will rely on the policy risk attribute alone.

You can see the code under [evaluate.js](../sts-broker-core/evaluate_request/evaluate.js) file:

    if (policy_risk > 50) {
        console.log("Manual approval required");
        approved = false;
    }
    else {
        console.log("Permission request is approved");
        approved = true;
    }

### Use your own permission request evaluation logic:

Each company will have different rules to automatically approve a permission request. Hence, you have the option to provide a S3 bucket object location with your own Lambda function deployment package zip file.

Your code will receive as the input the permission_request object. It simply needs to return an "automated_approval" attribute:


    const response = {
        automated_approval: <true or false>
    };
    
    return response;


If you do not provide your custom permission request evaluation code, the default one (which relies on STS Broker policy risk value) will be used.