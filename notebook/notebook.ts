import { CsvParseStream } from "@std/csv";
import {
  PATHS_CSV_COLUMNS,
  PathsCsvColumns,
  PathsCsvRecord,
  SUSPICIOUS_PATHS,
  urlPatterns,
} from "../src/utils.ts";
import { TextLineStream } from "@std/streams";
import "@std/dotenv/load";

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

async function getWhitelist(path: string | undefined): Promise<Set<string>> {
  if (path === undefined) {
    return new Set();
  }
  return new Set(await readList(path));
}

async function getPathIgnore(path: string | undefined): Promise<URLPattern[]> {
  if (path === undefined) {
    return [];
  }
  const paths = new Set(await readList(path));
  return [
    ...SUSPICIOUS_PATHS,
    ...urlPatterns(...paths),
  ];
}

async function readCsv(path: string): Promise<PathsCsvRecord[]> {
  const infile = await Deno.open(path);
  const readable = infile.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(
      new CsvParseStream({
        skipFirstRow: true,
        separator: ";",
        columns: PATHS_CSV_COLUMNS,
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

export async function firstCell(): Promise<string> {
  const csvPath = Deno.env.get("DNB_CSV_PATH");
  if (csvPath === undefined) {
    throw new Error("Undefined csvPath");
  }
  const [ips, paths] = await Promise.all([
    getWhitelist(Deno.env.get("DNB_WHILTELIST_PATH")),
    getPathIgnore(Deno.env.get("DNB_PATH_IGNORE")),
  ]);
  let data = await readCsv(csvPath);
  const count = data.length;
  data = data.filter(({ hostname, path }) => {
    for (const p of paths) {
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
  return `<p>${data.length} / ${count}</p>${table(data)}`;
}
