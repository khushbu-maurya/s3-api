const AWS = require("aws-sdk")
const { orderBy } = require("lodash")

// TODO: insert the valid endpoint here
const s3Endpoint = new AWS.Endpoint("https://afeed-storage.s3.eu-north-1.amazonaws.com")

// TODO: insert your credentials here
const s3Credentials = new AWS.Credentials({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_ACCESS_SECRET,
})

const s3 = new AWS.S3({
  endpoint: s3Endpoint,
  credentials: s3Credentials,
})

// TODO: insert your bucket name here
const BUCKET_NAME = process.env.BUCKET_NAME

const UploadController = {
  initializeMultipartUpload: async (req, res) => {
    const { name } = req.body

    const multipartParams = {
      Bucket: BUCKET_NAME,
      Key: `${name}`,
      ACL: "public-read",
    }

    try {
      const multipartUpload = await s3.createMultipartUpload(multipartParams).promise()
      
    res.send({
      fileId: multipartUpload.UploadId,
      fileKey: multipartUpload.Key,
    })

    } catch (error) {
      console.log(error)
    }


  },

  getMultipartPreSignedUrls: async (req, res) => {
    const { fileKey, fileId, parts } = req.body

    const multipartParams = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      UploadId: fileId,
    }

    const promises = []

    for (let index = 0; index < parts; index++) {
      promises.push(
        s3.getSignedUrlPromise("uploadPart", {
          ...multipartParams,
          PartNumber: index + 1,
        }),
      )
    }

    const signedUrls = await Promise.all(promises)

    const partSignedUrlList = signedUrls.map((signedUrl, index) => {
      return {
        signedUrl: signedUrl,
        PartNumber: index + 1,
      }
    })

    res.send({
      parts: partSignedUrlList,
    })
  },

  finalizeMultipartUpload: async (req, res) => {
    const { fileId, fileKey, parts } = req.body

    const multipartParams = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      UploadId: fileId,
      MultipartUpload: {
        // ordering the parts to make sure they are in the right order
        Parts: orderBy(parts, ["PartNumber"], ["asc"]),
      },
    }

    await s3.completeMultipartUpload(multipartParams).promise()

    res.send()
  },
}

module.exports = { UploadController }
