import { parseArgs } from "@std/cli";
import * as stdPath from "@std/path";
import { CaddyLog, caddyLog } from "../caddy.ts";
import { FilterStream, openWritable } from "../io.ts";
import { CliCommand, IA_CRAWLERS_AGENTS, SUSPICIOUS_PATHS } from "../utils.ts";

interface BanArgs {
  help: boolean;
  userAgentPath: string;
  suspiciousPaths: string;
  infiles: string[];
}

function parseBanArgs(args: string[]): BanArgs {
  let {
    help,
    "suspicious-paths": suspiciousPaths,
    "user-agents": userAgentPath,
    outdir,
    _: infiles,
  } = parseArgs(args, {
    boolean: ["help"],
    string: [
      "outdir",
      "user-agents",
      "suspicious-paths",
    ],
    default: {
      help: false,
      outdir: "",
    },
    alias: {
      help: "h",
    },
  });
  if (help) {
    return {
      help,
      infiles: [],
      suspiciousPaths: "",
      userAgentPath: "",
    };
  }
  if (suspiciousPaths === undefined) {
    suspiciousPaths = stdPath.join(outdir, "suspicious-paths.list");
  }
  if (userAgentPath === undefined) {
    userAgentPath = stdPath.join(outdir, "user-agents.list");
  }
  return {
    help,
    infiles: infiles.map((v) => v.toString()),
    suspiciousPaths,
    userAgentPath,
  };
}

function notAllowedUserAgentsFilter({ userAgent }: CaddyLog): boolean {
  for (const crawler of IA_CRAWLERS_AGENTS) {
    if (userAgent.includes(crawler)) {
      return true;
    }
  }
  return false;
}

function suspiciousPathsFilter({ url }: CaddyLog): boolean {
  for (const re of SUSPICIOUS_PATHS) {
    if (re.test(url)) {
      return true;
    }
  }
  return false;
}

class BanOutputStream extends TransformStream<CaddyLog, string> {
  constructor() {
    super({
      transform: (chunk, controller) => this.#transform(chunk, controller),
    });
  }

  #transform(
    { remoteIp }: CaddyLog,
    controller: TransformStreamDefaultController<string>,
  ) {
    controller.enqueue(remoteIp + "\n");
  }
}

export class BanCommand implements CliCommand {
  #args0: string;

  get arg0(): string {
    return this.#args0;
  }

  constructor(args0: string) {
    this.#args0 = args0;
  }

  async main(args: string[]): Promise<void> {
    const { help, infiles, suspiciousPaths, userAgentPath } = parseBanArgs(
      args,
    );
    if (help) {
      console.log(this.usage());
      return;
    }
    const [
      readable,
      suspiciousPathsOutput,
      userAgentPathOutput,
    ] = await Promise.all([
      caddyLog(infiles),
      openWritable(suspiciousPaths),
      openWritable(userAgentPath),
    ]);
    const [r1, r2] = readable.tee();
    const o1 = r1.pipeThrough(new FilterStream(suspiciousPathsFilter))
      .pipeThrough(new BanOutputStream())
      .pipeThrough(new TextEncoderStream())
      .pipeTo(suspiciousPathsOutput);
    const o2 = r2.pipeThrough(new FilterStream(notAllowedUserAgentsFilter))
      .pipeThrough(new BanOutputStream())
      .pipeThrough(new TextEncoderStream())
      .pipeTo(userAgentPathOutput);
    await Promise.all([o1, o2]);
  }

  usage(): string {
    return `Usage: ${this.#args0} ban
  [--user-agents OUTFILE]
  [--suspicious-paths OUTFILE]
  [--outdir OUTDIR]
  [--help]
  [--outdir=-]
  [...PATHS]

========================= OPTIONS =========================
  --help    Show this help.
`;
  }
}
