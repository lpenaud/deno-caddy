import { parseArgs } from "@std/cli";
import * as fs from "@std/fs";
import { CliCommand, PATHS_CSV_COLUMNS } from "../utils.ts";
import { CaddyLog, CaddyLogParseStream } from "../caddy.ts";
import { TextLineStream } from "@std/streams";
import { JsonParseStream } from "@std/json";
import { CsvStringifyStream } from "@std/csv";

interface PathsArgs {
  help: boolean;
  indir: string;
}

function parsePathsArgs(args: string[]): PathsArgs {
  const { help, indir } = parseArgs(args, {
    boolean: ["help"],
    string: ["indir"],
    default: {
      help: false,
    },
  });
  if (help) {
    return {
      help,
      indir: "",
    };
  }
  if (indir === undefined) {
    throw new Error("Missing indir arg");
  }
  return {
    help,
    indir,
  };
}

class LogFile {
  #path: string;

  #mtime: number;

  get path(): string {
    return this.#path;
  }

  get mtime(): number {
    return this.#mtime;
  }

  constructor(path: string, stat: Deno.FileInfo) {
    this.#path = path;
    this.#mtime = stat.mtime !== null ? stat.mtime.getTime() : 0;
  }

  async open(): Promise<ReadableStream<CaddyLog>> {
    const file = await Deno.open(this.#path);
    let readable = file.readable;
    if (this.#path.endsWith(".gz")) {
      readable = readable.pipeThrough(new DecompressionStream("gzip"));
    }
    return readable.pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream())
      .pipeThrough(new JsonParseStream())
      .pipeThrough(new CaddyLogParseStream());
  }
}

async function* walkLogDir(root: string) {
  const walk = fs.walk(root, {
    exts: [".log", ".log.gz"],
    includeDirs: false,
  });
  for await (const entry of walk) {
    const stat = await Deno.stat(entry.path);
    yield new LogFile(entry.path, stat);
  }
}

class PathOutputStream extends TransformStream<LogFile, string[]> {
  constructor() {
    super({
      start: (controller) => {
        controller.enqueue([...PATHS_CSV_COLUMNS]);
      },
      transform: (l, c) => this.#transform(l, c),
    });
  }

  async #transform(
    l: LogFile,
    controller: TransformStreamDefaultController<string[]>,
  ) {
    const readable = await l.open();
    for await (const r of readable) {
      controller.enqueue([
        l.path,
        r.method,
        r.url.hostname,
        r.url.pathname,
        r.remoteIp,
        r.status.code.toString(10),
        r.status.text,
      ]);
    }
  }
}

export class PathsCommand implements CliCommand {
  #args0: string;

  get arg0(): string {
    return this.#args0;
  }

  constructor(args0: string) {
    this.#args0 = args0;
  }

  usage(): string {
    return `Usage: ${this.#args0} paths
  [--help]
  [--indir INDIR]

========================= OPTIONS =========================
  - help    Show this help.
  - indir   Specify a log directory.
`;
  }

  async main(args: string[]): Promise<void> {
    const { help, indir } = parsePathsArgs(args);
    if (help) {
      console.log(this.usage());
      return;
    }
    const logs = await Array.fromAsync(walkLogDir(indir));
    logs.sort((a, b) => a.mtime - b.mtime);
    return ReadableStream.from(logs)
      .pipeThrough(new PathOutputStream())
      .pipeThrough(new CsvStringifyStream({ separator: ";" }))
      .pipeThrough(new TextEncoderStream())
      .pipeTo(Deno.stdout.writable, { preventClose: true });
  }
}
