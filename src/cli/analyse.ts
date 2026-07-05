import { parseArgs } from "@std/cli";
import { isErrorStatus } from "@std/http";
import { CsvStringifyStream } from "@std/csv";
import { FilterStream, openWritable } from "../io.ts";
import { CaddyLog, caddyLog, CaddyLogsColumns } from "../caddy.ts";
import { CliCommand } from "../utils.ts";

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

function logFilter({ url, status }: CaddyLog): boolean {
  return isErrorStatus(status.code) ||
    url.pathname.endsWith("robots.txt");
}

export class AnalyseCommand implements CliCommand {
  #arg0: string;

  get arg0(): string {
    return this.#arg0;
  }

  constructor(arg0: string) {
    this.#arg0 = arg0;
  }

  async main(args: string[]): Promise<void> {
    const { help, output, paths } = parseAnalyseArgs(args);
    if (help) {
      console.log(this.usage());
      return;
    }
    const [writable, readable] = await Promise.all([
      openWritable(output),
      caddyLog(paths),
    ]);
    await readable.pipeThrough(new FilterStream(logFilter))
      .pipeThrough(new CaddyLogsColumns())
      .pipeThrough(new CsvStringifyStream({ separator: ";" }))
      .pipeThrough(new TextEncoderStream())
      .pipeTo(writable);
  }

  usage(): string {
    return `Usage: ${this.#arg0} analyse
  [--help]
  [--output=-]
  [...PATHS]

========================= OPTIONS =========================
  - help    Show this help.
  - output  Specify a output file by default use stdout.
  - paths   Specify files to read by default use stdin.
`;
  }
}
