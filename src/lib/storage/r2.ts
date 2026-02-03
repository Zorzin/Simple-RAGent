import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const bucket = process.env.R2_BUCKET_NAME;
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!bucket || !accountId || !accessKeyId || !secretAccessKey) {
  throw new Error("R2 credentials are not fully configured");
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function normalizeBody(body: Blob | Buffer | Uint8Array) {
  if (body instanceof Uint8Array) {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (typeof (body as Blob).arrayBuffer === "function") {
    const buffer = await (body as Blob).arrayBuffer();
    return new Uint8Array(buffer);
  }
  return body;
}

export async function uploadToR2(params: {
  key: string;
  body: Blob | Buffer | Uint8Array;
  contentType?: string;
}) {
  const body = await normalizeBody(params.body);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    Body: body,
    ContentType: params.contentType,
  });

  await client.send(command);

  return {
    key: params.key,
    bucket,
  };
}

export async function deleteFromR2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
}
