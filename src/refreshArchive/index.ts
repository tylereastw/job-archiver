import type { Context, HttpRequest } from "@azure/functions";
import { fetchJobsRange } from "../lib/fetcher";
import { uploadSnapshot, writeLatestManifest } from "../lib/uploader";
import { ddmmyyyyLondon, yesterdayLondon, splitYMD } from "../lib/dates";

const WP_BASE = process.env.WP_BASE!;
const CONTAINER = process.env.BLOB_CONTAINER || "jobs-archive";
const PREFIX = process.env.BLOB_PREFIX || "jobs";

export default async function (context: Context, req: HttpRequest) {
  try {
    const target = (req.query?.date as string) || yesterdayLondon();
    const { url, items, count } = await fetchJobsRange(WP_BASE, target, target, s => context.log(s));

    const { y, m, d } = splitYMD(target);
    const blobPath = `${PREFIX}/${y}/${m}/${d}/jobs.json.gz`;
    const payload = { source: url, fetchedAt: new Date().toISOString(), start: target, end: target, count, items };

    await uploadSnapshot(process.env.AzureWebJobsStorage!, CONTAINER, blobPath, payload);
    await writeLatestManifest(process.env.AzureWebJobsStorage!, CONTAINER, PREFIX, blobPath, count);

    context.res = { status: 200, jsonBody: { ok: true, blob: blobPath, manifest: `${PREFIX}/latest.json`, count } };
  } catch (e: any) {
    context.log.error(e);
    context.res = { status: 500, jsonBody: { ok: false, error: String(e?.message || e) } };
  }
}
