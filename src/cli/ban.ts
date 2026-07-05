import { parseArgs } from "@std/cli";
import { CaddyLog, caddyLog } from "../caddy.ts";
import { FilterStream, openWritable } from "../io.ts";
import { CliCommand } from "../utils.ts";

interface BanArgs {
  help: boolean;
  output?: string;
  infiles: string[];
}

function parseBanArgs(args: string[]): BanArgs {
  const { help, output, _: infiles } = parseArgs(args, {
    boolean: ["help"],
    string: ["output"],
    default: {
      help: false,
    },
    alias: {
      help: "h",
      output: "o",
    },
  });
  if (help) {
    return {
      help,
      infiles: [],
    };
  }
  return {
    help,
    infiles: infiles.map((v) => v.toString()),
    output,
  };
}

function notAllowedUserAgents({ userAgent }: CaddyLog): boolean {
  return userAgent.includes("ClaudeBot") ||
    userAgent.includes("GPTBot") ||
    userAgent.includes("OAI-SearchBot");
}

function logFilter(l: CaddyLog): boolean {
  return notAllowedUserAgents(l);
}

class BanOutputStream extends TransformStream<CaddyLog, string> {
  #ips: Set<string>;

  constructor() {
    super({
      transform: (chunk, controller) => this.#transform(chunk, controller),
    });
    this.#ips = new Set();
  }

  #transform(
    { remoteIp }: CaddyLog,
    controller: TransformStreamDefaultController<string>,
  ) {
    if (this.#ips.has(remoteIp)) {
      return;
    }
    this.#ips.add(remoteIp);
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
    const { help, infiles, output } = parseBanArgs(args);
    if (help) {
      console.log(this.usage());
      return;
    }
    const [readable, writable] = await Promise.all([
      caddyLog(infiles),
      openWritable(output),
    ]);
    await readable.pipeThrough(new FilterStream(logFilter))
      .pipeThrough(new BanOutputStream())
      .pipeThrough(new TextEncoderStream())
      .pipeTo(writable);
  }

  usage(): string {
    return `Usage: ${this.#args0} ban
  [--help]
  [--output=-]
  [...PATHS]

========================= OPTIONS =========================
  - help    Show this help.
  - paths   Specify files to read by default use stdin.
`;
  }
}
