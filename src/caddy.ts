import { JsonValue } from "@std/json";
import { isStatus, STATUS_TEXT } from "@std/http";
import { fileTree, jsonStreamFactory } from "./io.ts";
import { DateTimeFormatFactory } from "./intl.ts";
import { mergeReadableStreams } from "@std/streams";

type CaddyLogRawHeader = string[] | undefined;

interface CaddyLogRequestRawRecord {
  remote_ip: string;
  method: string;
  host: string;
  uri: string;
  headers: Record<string, CaddyLogRawHeader>;
}

interface CaddyLogRawRecord {
  ts: number;
  request: CaddyLogRequestRawRecord;
  status: number;
}

export interface HttpStatus {
  code: number;
  text: string;
}

export interface CaddyLog {
  ts: Temporal.Instant;
  method: string;
  url: URL;
  remoteIp: string;
  status: HttpStatus;
  userAgent: string;
}

export class CaddyLogParseStream extends TransformStream<JsonValue, CaddyLog> {
  constructor() {
    super({
      transform: (chunk, controller) => {
        this.#transform(chunk, controller);
      },
    });
  }

  #transform(
    chunk: JsonValue,
    controller: TransformStreamDefaultController<CaddyLog>,
  ) {
    if (chunk === null) {
      return;
    }
    const raw = chunk as unknown as CaddyLogRawRecord;
    const log: CaddyLog = Object.create(null);
    const ts = Math.round(raw.ts * 1E3);
    log.method = raw.request.method;
    log.remoteIp = raw.request.remote_ip;
    log.status = this.#parseStatus(raw);
    log.ts = Temporal.Instant.fromEpochMilliseconds(ts);
    log.url = new URL("https://" + raw.request.host + raw.request.uri);
    log.userAgent = this.#parseHeader(raw.request.headers["User-Agent"]);
    controller.enqueue(log);
  }

  #parseStatus({ status: code }: CaddyLogRawRecord): HttpStatus {
    const status: HttpStatus = Object.create(null);
    status.code = code;
    status.text = isStatus(code) ? STATUS_TEXT[code] : "";
    return status;
  }

  #parseHeader(header: CaddyLogRawHeader): string {
    return header === undefined ? "" : header.join(" ");
  }
}

async function* openCaddyLog(paths: string[]) {
  for await (const p of fileTree(paths)) {
    const file = await Deno.open(p);
    let r = file.readable;
    if (p.endsWith(".gz")) {
      r = r.pipeThrough(new DecompressionStream("gzip"));
    }
    yield jsonStreamFactory(r);
  }
}

export async function caddyLog(
  paths: string[],
): Promise<ReadableStream<CaddyLog>> {
  if (paths.length === 0) {
    return jsonStreamFactory(Deno.stdin.readable)
      .pipeThrough(new CaddyLogParseStream());
  }
  const readables = await Array.fromAsync(openCaddyLog(paths));
  return mergeReadableStreams(...readables)
    .pipeThrough(new CaddyLogParseStream());
}

export class CaddyLogsColumns extends TransformStream<CaddyLog, string[]> {
  #dateFormatter: Intl.DateTimeFormat;

  constructor() {
    super({
      start: (controller) => {
        controller.enqueue([
          "date",
          "method",
          "url",
          "remoteIp",
          "statusCode",
          "statusText",
          "userAgent",
        ]);
      },
      transform: (chunk, controller) => this.#transform(chunk, controller),
    });
    this.#dateFormatter = DateTimeFormatFactory.instance.shortDateTime();
  }

  #transform(
    chunk: CaddyLog,
    controller: TransformStreamDefaultController<string[]>,
  ) {
    controller.enqueue([
      this.#dateFormatter.format(chunk.ts),
      chunk.method,
      chunk.url.href,
      chunk.remoteIp,
      chunk.status.code.toString(10),
      chunk.status.text,
      chunk.userAgent,
    ]);
  }
}
