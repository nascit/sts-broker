# sts-broker backlog

* [ ] Get slack URL from TEAM_PREFERENCES_TABLE DynamoDB table (sts-broker/slack/app.js)

* [ ] Secure "ApproveRequest" API (sts-broker-core/template.yaml)

* [ ] Managed policies for Default Role should be parameters (sts-broker-core/template.yaml)

* [ ] If team does not have a IAM role associated, use DEFAULT_ASSUMED_ROLE (sts-broker-core/approve/app.js)

* [ ] Avoid using Full Access manged policies (sts-broker-core/template.yaml)

* [ ] Ideally Resource field should only contain possible IAM roles that can be assumed.
      However, as the assumed roles can be dynamically inserted on the team_preferences table, this cannot be done (sts-broker-core/template.yaml)
      
* [ ] Automatic approval flow. Make a request to the APPROVAL_URL. (sts-broker-core/evaluate_request/auto_approve.js)

* [ ] Sample business logic to decide whether this permission request should be automatically approved or not. (sts-broker-core/evaluate_request/evaluate.js)

* [ ] Session duration can also be a parameter (sts-broker-core/approve/app.js)

* [ ] Notify user the permission is already approved. (sts-broker-core/evaluate_request/validate.js)

* [ ] Validate permission request before sending to State machine. (sts-broker-core/evaluate_request/validate.js)

* [ ] User can also pass up to 10 managed policy ARNs. (sts-broker-core/request_credentials/app.js)

* [ ] User can pass tags (sts-broker-core/request_credentials/app.js)

* [ ] Present to user team managed ARNs






