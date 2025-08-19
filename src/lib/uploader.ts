import { BlobServiceClient } from "@azure/storage-blob";
import * as zlib from "zlib";

// Official JS SDK supports upload from Buffer/stream/text. We'll gzip the JSON then upload with proper headers. :contentReference[oaicite:3]{index=3}
export async function uploadSnapshot(
  connStr: string,
  containerName: string,
  blobPath: string,
  payload: object
) {
  const svc = BlobServiceClient.fromConnectionString(connStr);
  const container = svc.getContainerClient(containerName);
  await container.createIfNotExists();

  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(payload)));
  const blob = container.getBlockBlobClient(blobPath);
  await blob.uploadData(gz, {
    blobHTTPHeaders: {
      blobContentType: "application/json",
      blobContentEncoding: "gzip",
      blobCacheControl: "public, max-age=31536000, immutable"
    }
  });
}

export async function writeLatestManifest(
  connStr: string,
  containerName: string,
  prefix: string,
  pointsTo: string,
  count: number
) {
  const svc = BlobServiceClient.fromConnectionString(connStr);
  const container = svc.getContainerClient(containerName);
  await container.createIfNotExists();

  const latest = container.getBlockBlobClient(`${prefix}/latest.json`);
  const body = Buffer.from(JSON.stringify({
    blob: pointsTo,
    updatedAt: new Date().toISOString(),
    count
  }, null, 2));
  await latest.uploadData(body, {
    overwrite: true,
    blobHTTPHeaders: {
      blobContentType: "application/json",
      blobCacheControl: "no-cache"
    }
  });
}
