import { parseArgs } from "@std/cli";
import { CaddyLog, caddyLog, CaddyLogsColumns } from "../caddy.ts";
import { openWritable } from "../io.ts";
import { DateTimeFormatFactory } from "../intl.ts";
import { CsvStringifyStream } from "@std/csv/stringify-stream";

function getHttpStatusColor(status: number) {
  switch ((status / 100) | 0) {
    case 2:
      return "green"; // Succès
    case 3:
      return "cyan"; // Redirection
    case 4:
      return "yellow"; // Erreur client
    case 5:
      return "red"; // Erreur serveur
    default:
      return "gray"; // Autre
  }
}

function usage(arg0: string): string {
  return `Usage: ${arg0}
  [-h --help]
  [-o --outfile PATH]
  [...INFILES=-]

============================= OPTIONS ==============================
  - help        Show this help.
  - outfile     Add one or more outputs files more than the stdout.
  - infiles     Specify files to read by default use the stdin.
`;
}

interface LogsArgs {
  help: boolean;
  infiles: string[];
  outfile?: string;
}

function parseLogsArgs(args: string[]): LogsArgs {
  const { outfile, help, _: infiles } = parseArgs(args, {
    string: ["outfile"],
    boolean: ["help"],
    default: {
      help: false,
    },
    alias: {
      outfile: "o",
      help: "h",
    },
  });
  if (help) {
    return {
      help,
      infiles: [],
      outfile,
    };
  }
  return {
    help,
    infiles: infiles.map((v) => v.toString()),
    outfile,
  };
}

async function logVisitor(logs: AsyncIterable<CaddyLog>) {
  const dtFormat = DateTimeFormatFactory.instance.shortTime();
  for await (const chunk of logs) {
    console.log(
      "%s %s %s %c%s%c %s (%s)",
      dtFormat.format(chunk.ts),
      chunk.method,
      chunk.url.href,
      `color: ${getHttpStatusColor(chunk.status.code)};`,
      chunk.status.code,
      `color: inherit;`,
      chunk.remoteIp,
      chunk.userAgent,
    );
  }
}

export async function logs(arg0: string, args: string[]): Promise<void> {
  const { help, infiles, outfile } = parseLogsArgs(args);
  if (help) {
    console.log(usage(arg0));
    return;
  }
  const readable = await caddyLog(infiles);
  if (outfile === undefined) {
    await logVisitor(readable);
    return;
  }
  const writable = await openWritable(outfile);
  const [r1, r2] = readable.tee();
  await Promise.all([
    logVisitor(r1),
    r2.pipeThrough(new CaddyLogsColumns())
      .pipeThrough(new CsvStringifyStream({ separator: ";" }))
      .pipeThrough(new TextEncoderStream())
      .pipeTo(writable),
  ]);
}
