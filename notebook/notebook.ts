import { CsvParseStream } from "@std/csv";
import {
  PATHS_CSV_COLUMNS,
  PathsCsvColumns,
  PathsCsvRecord,
} from "../src/utils.ts";
import { TextLineStream } from "@std/streams";
import "@std/dotenv/load";
import { SUSPICIOUS_PATHS, urlPatterns } from "../src/filters.ts";

async function readList(path: string): Promise<string[]> {
  const file = await Deno.open(path);
  const readable = file.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream())
    .pipeThrough(
      new TransformStream<string, string>({
        transform: (chunk, controller) => {
          const line = chunk.trim();
          if (line.startsWith("#") || line.length === 0) {
            return;
          }
          controller.enqueue(line);
        },
      }),
    );
  return await Array.fromAsync(readable);
}

async function getWhitelist(): Promise<Set<string>> {
  const path = Deno.env.get("DNB_WHILTELIST_PATH");
  if (path === undefined) {
    return new Set();
  }
  return new Set(await readList(path));
}

async function getPathIgnore(): Promise<URLPattern[]> {
  const path = Deno.env.get("DNB_PATH_IGNORE");
  if (path === undefined) {
    return [];
  }
  const paths = new Set(await readList(path));
  return [
    ...SUSPICIOUS_PATHS,
    ...urlPatterns(...paths),
  ];
}

async function readCsv(): Promise<Omit<PathsCsvRecord, "date">[]> {
  const path = Deno.env.get("DNB_CSV_PATH");
  if (path === undefined) {
    throw new Error("Undefined DNB_CSV_PATH");
  }
  const infile = await Deno.open(path);
  const readable = infile.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(
      new CsvParseStream({
        skipFirstRow: true,
        separator: ";",
        columns: [
          "log",
          "method",
          "hostname",
          "path",
          "remoteIp",
          "statusCode",
          "statusText",
        ],
      }),
    );
  return await Array.fromAsync(readable);
}

function table(data: PathsCsvRecord[]) {
  const keys: PathsCsvColumns[] = [
    "path",
    "remoteIp",
    "statusCode",
    "statusText",
  ];
  let content = "";
  content += "<thead><tr>";
  for (const k of keys) {
    content += `<th>${k}</th>`;
  }
  content += "</tr></thead>";
  content += "<tbody>";
  for (const r of data) {
    content += "<tr>";
    for (const k of keys) {
      content += `<td>${r[k]}</td>`;
    }
    content += "</tr>";
  }
  content += "</tbody>";
  return `<table>${content}</table>`;
}

interface PathPredicateArg {
  hostname: string;
  path: string;
}

export async function firstCell(): Promise<string> {
  let [ips, patterns, data] = await Promise.all([
    getWhitelist(),
    getPathIgnore(),
    readCsv(),
  ]);
  const count = data.length;
  data = data.filter(({ hostname, path }) => {
    for (const p of patterns) {
      if (p.test(`https://${hostname}${path}`)) {
        return false;
      }
    }
    return true;
  });
  if (ips.size > 0) {
    data = data.filter((r) => !ips.has(r.remoteIp));
  }
  data.sort((a, b) => a.remoteIp.localeCompare(b.remoteIp));
  return `<p>${data.length} / ${count}</p>${table(data as PathsCsvRecord[])}`;
}

export async function secondCell(): Promise<string> {
  let data = await readCsv();
  data = data.filter(({ statusCode }) => statusCode === "200");
  data = data.filter(({ hostname, path }) => {
    for (const p of SUSPICIOUS_PATHS) {
      if (p.test(`https://${hostname}${path}`)) {
        return true;
      }
      return false;
    }
  });
  const byPath = Map.groupBy(data, ({ path }) => path);
  // data.sort((a, b) => a.remoteIp.localeCompare(b.remoteIp));
  return `<ul>
  ${
    byPath.entries()
      .map(([k, v]) => `<li>${k}: ${v.length}</li>`)
      .reduce((s, v) => s + v, "")
  }
</ul>`;
}
