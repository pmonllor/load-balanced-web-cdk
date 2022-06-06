const S3 = new (require('aws-sdk/clients/s3'))()

const client = new S3({ region: "us-east-1" });

const api = process.env.API_ENDPOINT
const Bucket = process.env.BUCKET_NAME

const params = {
    Bucket,
    Key: 'db.txt',
    Body: api,
};

exports.handler = async () => {
    try {
        const response = await client.putObject(params);
        console.log('Response: ', response);
        return response;

    } catch (err) {
        console.log(err);
    }
};
