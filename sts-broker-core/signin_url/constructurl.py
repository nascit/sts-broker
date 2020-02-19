import urllib, json, sys
import requests # 'pip install requests'
import boto3 # AWS SDK for Python (Boto3) 'pip install boto3'

def lambdaHandler(event, context):

    # Format resulting temporary credentials into JSON
    url_credentials = {}
    url_credentials['sessionId'] = event['credentials']['AccessKeyId']
    url_credentials['sessionKey'] = event['credentials']['SecretAccessKey']
    url_credentials['sessionToken'] = event['credentials']['SessionToken']
    json_string_with_temp_credentials = json.dumps(url_credentials)

    # Make request to AWS federation endpoint to get sign-in token. Construct the parameter string with
    # the sign-in action request, a 12-hour session duration, and the JSON document with temporary credentials
    # as parameters.
    request_parameters = "?Action=getSigninToken"
#     request_parameters += "&SessionDuration=43200" TODO: Understand why cannot use SessionDuration
    if sys.version_info[0] < 3:
        def quote_plus_function(s):
            return urllib.quote_plus(s)
    else:
        def quote_plus_function(s):
            return urllib.parse.quote_plus(s)
    request_parameters += "&Session=" + quote_plus_function(json_string_with_temp_credentials)
    request_url = "https://signin.aws.amazon.com/federation" + request_parameters
    r = requests.get(request_url)
    print(request_url)
    print(r)
    # Returns a JSON document with a single element named SigninToken.
    signin_token = json.loads(r.text)

    # Create URL where users can use the sign-in token to sign in to
    # the console. This URL must be used within 15 minutes after the
    # sign-in token was issued.
    request_parameters = "?Action=login"
    request_parameters += "&Destination=" + quote_plus_function("https://console.aws.amazon.com/")
    request_parameters += "&SigninToken=" + signin_token["SigninToken"]
    request_url = "https://signin.aws.amazon.com/federation" + request_parameters

    # Send final URL to stdout
    print (request_url)


    message = 'Hello {}!'.format(event['credentials'])
    print(message)
    return {
        'request_url' : request_url
    }