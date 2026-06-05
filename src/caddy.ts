import { JsonValue } from "@std/json";
import { isStatus, STATUS_TEXT } from "@std/http";

interface CaddyLogRequestRawRecord {
  remote_ip: string;
  method: string;
  host: string;
  uri: string;
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
  ts: Date;
  method: string;
  url: URL;
  remoteIp: string;
  status: HttpStatus;
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
    log.method = raw.request.method;
    log.remoteIp = raw.request.remote_ip;
    log.status = this.#parseStatus(raw);
    log.ts = new Date(raw.ts * 1E3);
    log.url = new URL("https://" + raw.request.host + raw.request.uri);
    controller.enqueue(log);
  }

  #parseStatus({ status: code }: CaddyLogRawRecord): HttpStatus {
    const status: HttpStatus = Object.create(null);
    status.code = code;
    status.text = isStatus(code) ? STATUS_TEXT[code] : "";
    return status;
  }
}
