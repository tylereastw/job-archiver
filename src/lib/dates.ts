// Europe/London calendar handling, robust across BST/GMT.
export function ddmmyyyyLondon(date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit", month: "2-digit", year: "numeric"
  });
  const parts = fmt.formatToParts(date);
  const d = parts.find(p => p.type === "day")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const y = parts.find(p => p.type === "year")!.value;
  return `${d}-${m}-${y}`;
}

export function yesterdayLondon(): string {
  const todayStr = ddmmyyyyLondon();
  const [d, m, y] = todayStr.split("-").map(Number);
  const todayUTC = new Date(Date.UTC(y, m - 1, d));
  const yest = new Date(todayUTC.getTime() - 24 * 60 * 60 * 1000);
  return ddmmyyyyLondon(yest);
}

export function splitYMD(ddmmyyyy: string) {
  const [d, m, y] = ddmmyyyy.split("-").map(Number);
  return {
    y: String(y),
    m: String(m).padStart(2, "0"),
    d: String(d).padStart(2, "0")
  };
}
