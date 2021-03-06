'use strict'
process.env.TZ = 'Asia/Seoul'
const AWS = require('aws-sdk')
const fs = require('fs')
const readline = require('readline')
const { Client } = require('elasticsearch')

const region = process.env.AWS_REGION

const s3 = new AWS.S3()

module.exports.executeETL = async (event, context, callback) => {
  const ssm = new AWS.SSM({ region })

  function getParameter(params) {
    return new Promise((resolve, reject) => {
      ssm.getParameter(params, function (err, data) {
        if (err) {
          reject(err)
        } else {
          const value = data.Parameter.Value
          resolve(value)
        }
      })
    })
  }

  const params = {
    Name: 'elasticsearch',
  }
  const values = await getParameter(params)
  const secret = JSON.parse(values)
  console.log('SECRET MANAGER VALUES :: ', secret)
  const opts = {
    hosts: secret.hosts,
    srcBucket: event.s3_bucketName,
    prefix: event.s3_market_prefix,
    indexName: event.es_market_indexName,
    typeName: event.es_market_typeName,
  }
  console.log('PARAMS :: ', secret)

  const esClient = new Client({
    hosts: [opts.hosts],
    // log: 'trace',
  })

  const { srcBucket, prefix, indexName, typeName } = opts

  let messages = 'SUCCESS'

  const checkIndex = async (index) => {
    return new Promise((resolve, reject) => {
      esClient.indices
        .exists({
          index,
        })
        .then(
          (resp) => {
            resolve(resp)
          },
          (err) => {
            console.log('>>> ERROR checkIndex <<< ', index)
            console.trace(err)
            reject(err)
          }
        )
    })
  }

  const deleteIndex = async (index) => {
    return new Promise((resolve, reject) => {
      esClient.indices
        .delete({
          index,
        })
        .then(
          (resp) => {
            console.log('>>> [ELASTICSEARCH] DELETE INDEX SUCCESS', index)
            resolve()
          },
          (err) => {
            console.log('>>> ERROR deleteIndex <<< ', index)
            console.trace(err)
            reject(err)
          }
        )
    })
  }

  const createIndex = async (index) => {
    return new Promise((resolve, reject) => {
      esClient.indices
        .create({
          index,
        })
        .then(
          (resp) => {
            console.log(resp)
            console.log('>>> [ELASTICSEARCH] CREATE INDEX SUCCESS', index)
            resolve()
          },
          (err) => {
            console.log('>>> ERROR createIndex <<< ', index)
            console.trace(err)
            reject(err)
          }
        )
    })
  }
  const closeIndex = async (index) => {
    return new Promise((resolve, reject) => {
      esClient.indices.close({ index }).then(
        (resp) => {
          console.log('>>> [ELASTICSEARCH] CLOSE INDEX SUCCESS', index)
          resolve()
        },
        (err) => {
          console.log('>>> ERROR closeIndex <<< ', index)
          console.trace(err)
          reject(err)
        }
      )
    })
  }
  const openIndex = async (index) => {
    return new Promise((resolve, reject) => {
      esClient.indices.open({ index }).then(
        (resp) => {
          console.log('>>> [ELASTICSEARCH] OPEN INDEX SUCCESS', index)
          resolve()
        },
        (err) => {
          console.log('>>> ERROR openIndex <<< ', index)
          console.trace(err)
          reject(err)
        }
      )
    })
  }
  const putSettings = async (index) => {
    const settings = JSON.parse(fs.readFileSync('./config/settings.json'))
    return new Promise((resolve, reject) => {
      esClient.indices.putSettings({ index, body: settings }).then(
        (resp) => {
          console.log('>>> [ELASTICSEARCH] PUT SETTINGS SUCCESS', index)
          resolve()
        },
        (err) => {
          console.log('>>> ERROR putSettings <<< ', index)
          console.trace(err)
          reject(err)
        }
      )
    })
  }
  const putMapping = async (index, type) => {
    const mapping = JSON.parse(fs.readFileSync('./config/mappings_market.json'))
    await esClient.indices.putMapping({ index, type, body: mapping, includeTypeName: true }).then(
      (resp) => {
        console.log('>>> [ELASTICSEARCH] PUT MAPPING SUCCESS', index)
      },
      (err) => {
        console.log('>>> ERROR putMapping <<< ', index)
        console.error(err)
      }
    )
  }

  const countIndex = async (index, type) => {
    return new Promise((resolve, reject) => {
      esClient
        .count({
          index,
          type,
        })
        .then(
          (resp) => {
            resolve(resp.count)
          },
          (err) => {
            console.log('>>> ERROR countIndex <<< ', index)
            console.trace(err)
            reject(err)
          }
        )
    })
  }

  const truncate = new Promise(async (resolve, reject) => {
    const check = await checkIndex(indexName) // ????????? ?????? ?????? ??????
    console.log(` INDEX EXISTS? ${check}`)
    if (check) {
      // ???????????? ??????????????? ?????? ????????? ??????
      await deleteIndex(indexName)
    }
    await createIndex(indexName) // ????????? ??????
    await closeIndex(indexName) // ????????? ??????
    await putSettings(indexName) // ????????? ?????? ??????
    await openIndex(indexName) // ????????? ??????
    await putMapping(indexName, typeName) // ?????? ?????? ??????
    resolve()
  })

  const ETL = {
    productCategories: {
      mapper: require('./mapper/productCategories'),
    },
    products: {
      mapper: require('./mapper/products'),
    },
  }
  const getConfig = (srcKey) => {
    const regex = /\/(\w+)\.json$/g
    const match = regex.exec(srcKey)

    return ETL[match[1]]
  }

  const readLineProcess = (jsonName) => {
    return new Promise((resolve, reject) => {
      console.log(jsonName)
      const srcKey = `${prefix}/${jsonName}`
      const params = {
        Bucket: srcBucket,
        Key: srcKey,
      }

      console.log(params)
      const s3ReadStream = s3.getObject(params).createReadStream()
      const rl = readline.createInterface({
        input: s3ReadStream,
        terminal: false,
      })

      const { mapper } = getConfig(srcKey)
      const fcn = mapper

      let documentsValues = []

      const bulk = async (values) => {
        try {
          const body = values.reduce((arr, doc) => arr.concat([{ index: { _index: indexName, _type: typeName, _id: doc.id, routing: doc.category_id } }, doc]), [])
          let bodyStr = ''
          for (let b of body) {
            bodyStr = bodyStr + JSON.stringify(b) + '\n'
          }
          // console.log(bodyStr)

          await esClient.bulk({ refresh: true, body: bodyStr }).then((resp) => {
            resp.items.filter((item) => {
              if (item.index.status === 400) {
                console.log(JSON.stringify(item))
              }
            })
          })
        } catch (err) {
          console.error(`>>> ERROR bulk <<< ${indexName}/${typeName}`)
          console.error(err)
          return false
        }
      }

      rl.on('line', async (line) => {
        const documents = fcn(JSON.parse(line))
        documentsValues.push(documents)
      })
      rl.on('error', () => {
        console.error('>>> ERROR readline <<< ')
      })
      rl.on('close', async () => {
        await bulk(documentsValues)
        await countIndex(indexName, typeName)

        resolve()
      })
    })
  }

  try {
    await truncate

    await readLineProcess('productCategories.json')
    await readLineProcess('products.json')
  } catch (err) {
    console.error('>>> ERROR <<<')
    console.error(err)
    messages = err
    return {
      statusCode: 500,
      body: messages,
    }
  }
  return {
    statusCode: 200,
    event,
  }
}
