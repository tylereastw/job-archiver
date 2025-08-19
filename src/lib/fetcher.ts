import * as https from "https";

function getJson(url: string): Promise<{ status: number; headers: any; body: any }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "ugc-archiver/1.0" } }, res => {
      const chunks: Buffer[] = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let body: any = null;
        try { body = text ? JSON.parse(text) : null; } catch { body = text; }
        resolve({ status: res.statusCode || 0, headers: res.headers, body });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

export async function fetchJobsRange(base: string, start: string, end: string, log: (s: string)=>void) {
  const url = `${base}/wp-json/wpjm_public/v1/jobs/${start}/${end}`;
  let attempt = 0;
  while (attempt < 5) {
    attempt++;
    const { status, headers, body } = await getJson(url);
    if (status === 200) {
      const items = Array.isArray(body) ? body : (body?.items ?? []);
      const count = Array.isArray(body) ? body.length : (body?.count ?? items.length ?? 0);
      return { url, items, count };
    }
    const retryAfter = parseInt(String(headers?.["retry-after"] || "0"), 10);
    const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.min(2 ** attempt * 500, 10000);
    log(`[fetcher] HTTP ${status}, retry in ${backoff}ms`);
    await new Promise(r => setTimeout(r, backoff));
  }
  throw new Error("Failed to fetch jobs after retries");
}
