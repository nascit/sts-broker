# STS Broker

__Status__: _Work-in-progress. Please create issues or pull requests if you have ideas for improvement._

This project can be used as a reference for a serverless AWS custom Identity Broker architecture.

- What is an Identity Broker?

An Identity Broker is responsible for mapping the end user identifier into a set of temporary credentials for accessing AWS resources. Within the broker, you can apply your own rules to approve and match permissions based on the user data.

<img src="IdentityBroker.png?raw=true" width="400">

- Why would you need a custom Identity Broker?

    - Least privilege access: "The right access to the right things at the right time to do their job and nothing more."
    - Enforce separation of duties with the appropriate authorization for each interaction with your AWS resources.
    - Rely on attributes for fine-grained permissions at scale.
        - [What Is ABAC (Attribute-based access control) for AWS?](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction_attribute-based-access-control.html)
        - You can tag your STS Broker temporary sessions based on federated user attributes and/or STS Broker policy default tags.
    - Reduce or even eliminating reliance on long-term credentials.
    - Centralize privilege management across your organization.
    - Record every permission request made (traceability).
    - More details on this Re:Invent session:
    
		[<img src="https://img.youtube.com/vi/vbjFjMNVEpc/0.jpg" width="280">](https://www.youtube.com/watch?v=vbjFjMNVEpc&t=420s)
   

## Getting started

To deploy this solution in your own AWS account and create the required components, see the [getting started](docs/getting_started.md) guide in the documentation section.

## Architecture

![STS Broker Architecture](STSBroker.png "STS Broker architecture")

### Technologies used

__Communication/Messaging__:

* [Amazon API Gateway](https://aws.amazon.com/api-gateway/) for interactions between users and the platform.

__Authentication/Authorization__:

* [Amazon Cognito](https://aws.amazon.com/cognito/) for managing and authenticating users.
* [AWS Identity and Access Management](https://aws.amazon.com/iam/)

__Compute__:

* [AWS Lambda](https://aws.amazon.com/lambda/) as serverless compute either behind APIs or to react to asynchronous events.

__CI/CD__:

* [AWS CloudFormation](https://aws.amazon.com/cloudformation/) with [AWS Serverless Application Model](https://aws.amazon.com/serverless/sam/) for defining AWS resources as code.

__Storage__:

* [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) as a scalable NoSQL database for persisting informations.

__Monitoring__:

* [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/) for metrics, dashboards, log aggregation.

__Testing__:

* [cognitocurl](https://github.com/nordcloud/cognitocurl) for sending requests to the broker without the use of STS Broker CLI.


## Documentation

See the [docs](docs/) folder for the documentation.


## Roadmap

The whole point on building a custom Identity Broker on AWS is to have flexibility. Possibilities here are endless to make your AWS environment more secure. Here are some ideas:

- Use machine learning models to automate approval based on history.

- UI to manage STS Broker policies.


## License Summary

This code is made available under the MIT license. See the LICENSE file.