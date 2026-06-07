import { JsonValue } from "@std/json";
import { isStatus, STATUS_TEXT } from "@std/http";
import { jsonStreamFactory, openFiles } from "./io.ts";

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

export async function caddyLog(paths: string[]) {
  const stream = await openFiles(paths, (r) => jsonStreamFactory(r));
  return stream.pipeThrough(new CaddyLogParseStream());
}
