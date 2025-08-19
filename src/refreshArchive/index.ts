import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { fetchJobsRange } from "../lib/fetcher";
import { uploadSnapshot, writeLatestManifest } from "../lib/uploader";
import { yesterdayLondon, splitYMD } from "../lib/dates";

const WP_BASE = process.env.WP_BASE!;
const CONTAINER = process.env.BLOB_CONTAINER || "jobs-archive";
const PREFIX = process.env.BLOB_PREFIX || "jobs";

// Handler
export async function refreshArchive(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // optional: allow ?date=DD-MM-YYYY for ad-hoc backfills
    const target = req.query.get("date") || yesterdayLondon();

    const { url, items, count } = await fetchJobsRange(WP_BASE, target, target, (m) => context.log(m));

    const { y, m, d } = splitYMD(target);
    const blobPath = `${PREFIX}/${y}/${m}/${d}/jobs.json.gz`;
    const payload = { source: url, fetchedAt: new Date().toISOString(), start: target, end: target, count, items };

    await uploadSnapshot(process.env.AzureWebJobsStorage!, CONTAINER, blobPath, payload);
    await writeLatestManifest(process.env.AzureWebJobsStorage!, CONTAINER, PREFIX, blobPath, count);

    return { status: 200, jsonBody: { ok: true, blob: blobPath, manifest: `${PREFIX}/latest.json`, count } };
  } catch (e: any) {
    context.error(e);
    return { status: 500, jsonBody: { ok: false, error: String(e?.message || e) } };
  }
}

// Bindings defined in code (v4 model)
app.http("refreshArchive", {
  methods: ["POST"],
  authLevel: "function",   // require a function key; set to "anonymous" if you want it public
  handler: refreshArchive
});
