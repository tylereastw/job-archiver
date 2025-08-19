import type { Context } from "@azure/functions";
import { fetchJobsRange } from "../lib/fetcher";
import { uploadSnapshot, writeLatestManifest } from "../lib/uploader";
import { ddmmyyyyLondon, yesterdayLondon, splitYMD } from "../lib/dates";

// Environment variables (set in Function App -> Configuration)
const WP_BASE = process.env.WP_BASE!;
const CONTAINER = process.env.BLOB_CONTAINER || "jobs-archive";
const PREFIX = process.env.BLOB_PREFIX || "jobs";
const RANGE_TO_TODAY = (process.env.RANGE_TO_TODAY || "false").toLowerCase() === "true";

export default async function (context: Context): Promise<void> {
  if (!WP_BASE) throw new Error("WP_BASE required");

  const start = yesterdayLondon();
  const end = RANGE_TO_TODAY ? ddmmyyyyLondon() : start;

  context.log(`[archiveJobs] range ${start} -> ${end}`);

  const { url, items, count } = await fetchJobsRange(WP_BASE, start, end, s => context.log(s));

  const payload = { source: url, fetchedAt: new Date().toISOString(), start, end, count, items };

  const { y, m, d } = splitYMD(start);  // store under the start date
  const blobPath = `${PREFIX}/${y}/${m}/${d}/jobs.json.gz`;

  await uploadSnapshot(process.env.AzureWebJobsStorage!, CONTAINER, blobPath, payload);
  await writeLatestManifest(process.env.AzureWebJobsStorage!, CONTAINER, PREFIX, blobPath, count);

  context.log(`[archiveJobs] snapshot -> ${blobPath} (items=${count}); latest.json updated`);
}
