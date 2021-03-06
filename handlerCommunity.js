const AWS = require('aws-sdk')

AWS.config.apiVersions = {
  ssm: '2014-11-06',
}

const region = process.env.AWS_REGIO

module.exports.executeETL = async (event, context, callback) => {
  const params = {
    DocumentName: 'arn:aws:ssm:ap-northeast-2::document/AWS-RunShellScript',
    MaxConcurrency: '50',
    MaxErrors: '0',
    Parameters: {
      commands: ['/home/ubuntu/exportCommunity/exportElasticsearch.sh'],
    },
    Targets: [
      {
        Key: 'tag:Name',
        Values: ['medistream-market-stg'],
      },
    ],
    TimeoutSeconds: 3600,
  }

  const ssm = new AWS.SSM()
  const wrapedSendCommand = async (params) => {
    return new Promise((resolve, reject) => {
      ssm.sendCommand(params, function (err, data) {
        if (err) {
          console.log(err, err.stack)
          reject(err)
        }
        // an error occurred
        else {
          resolve(data)
        }
      })
    })
  }

  let res = await wrapedSendCommand(params)

  // TODO implement
  const response = {
    statusCode: 200,
    body: JSON.stringify(res),
  }
  return callback(null, response)
}
