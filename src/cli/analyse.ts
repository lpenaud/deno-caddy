import { parseArgs } from "@std/cli";
import { isErrorStatus } from "@std/http";
import { CsvStringifyStream } from "@std/csv";
import { openWritable } from "../io.ts";
import { CaddyLog, caddyLog } from "../caddy.ts";

function usage(arg0: string) {
  return `Usage: ${arg0} analyse
  [--help]
  [--output=-]
  [...PATHS]

========================= OPTIONS =========================
  - help    Show this help.
  - output  Specify a output file by default use stdout.
  - paths   Specify files to read by default use stdin.
`;
}

interface AnalyseArgs {
  help: boolean;
  output: string;
  paths: string[];
}

function parseAnalyseArgs(args: string[]): AnalyseArgs {
  const { output, help, _: paths } = parseArgs(args, {
    string: ["output"],
    boolean: ["help"],
    default: {
      help: false,
      output: "-",
    },
  });
  if (help) {
    return {
      help,
      output,
      paths: [],
    };
  }
  return {
    help,
    output,
    paths: paths.map((v) => v.toString()),
  };
}

class AnalyseStream extends TransformStream<CaddyLog, string[]> {
  constructor() {
    super({
      start: (controller) => {
        controller.enqueue([
          "method",
          "url",
          "remoteIp",
          "statusCode",
          "statusText",
        ]);
      },
      transform: (chunk, controller) => this.#transform(chunk, controller),
    });
  }

  #transform(
    chunk: CaddyLog,
    controller: TransformStreamDefaultController<string[]>,
  ) {
    if (!isErrorStatus(chunk.status.code)) {
      return;
    }
    controller.enqueue([
      chunk.method,
      chunk.url.href,
      chunk.remoteIp,
      chunk.status.code.toString(10),
      chunk.status.text,
    ]);
  }
}

export async function analyse(arg0: string, args: string[]): Promise<void> {
  const { help, output, paths } = parseAnalyseArgs(args);
  if (help) {
    console.log(usage(arg0));
    return;
  }
  const [writable, readable] = await Promise.all([
    openWritable(output),
    caddyLog(paths),
  ]);
  await readable.pipeThrough(new AnalyseStream())
    .pipeThrough(new CsvStringifyStream({ separator: ";" }))
    .pipeThrough(new TextEncoderStream())
    .pipeTo(writable);
}
