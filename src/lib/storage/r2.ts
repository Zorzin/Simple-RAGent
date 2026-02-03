import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const bucket = process.env.R2_BUCKET_NAME;
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!bucket || !accountId || !accessKeyId || !secretAccessKey) {
  throw new Error("R2_CREDENTIALS_MISSING");
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

async function streamToBuffer(stream: ReadableStream | NodeJS.ReadableStream) {
  if (stream instanceof ReadableStream) {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stream as NodeJS.ReadableStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function downloadFromR2(key: string) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await client.send(command);
  if (!response.Body) {
    throw new Error("R2_OBJECT_BODY_MISSING");
  }

  const buffer = await streamToBuffer(response.Body as NodeJS.ReadableStream);
  return buffer;
}
