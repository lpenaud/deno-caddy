import { parseArgs } from "@std/cli";
import { CaddyLog, caddyLog } from "../caddy.ts";
import { CliCommand } from "../utils.ts";
import { IA_CRAWLERS_AGENTS, SUSPICIOUS_PATHS } from "../filters.ts";
import { IpSetFactory } from "../ipset.ts";

interface BanArgs {
  help: boolean;
  infiles: string[];
}

function parseBanArgs(args: string[]): BanArgs {
  const {
    help,
    _: infiles,
  } = parseArgs(args, {
    boolean: ["help"],
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
    };
  }
  return {
    help,
    infiles: infiles.map((v) => v.toString()),
  };
}

function* testPath({ url }: CaddyLog) {
  for (const pattern of SUSPICIOUS_PATHS) {
    if (pattern.test(url)) {
      yield pattern;
    }
  }
}

function testUserAgent({ userAgent }: CaddyLog) {
  for (const crawler of IA_CRAWLERS_AGENTS) {
    if (userAgent.includes(crawler)) {
      return crawler;
    }
  }
  return null;
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
    const { help, infiles } = parseBanArgs(
      args,
    );
    if (help) {
      console.log(this.usage());
      return;
    }
    const factory = new IpSetFactory();
    const logs = await caddyLog(infiles);
    const [userAgentSet, suspiciousSet] = await Promise.all([
      factory.createHashIp({
        name: "user-agent",
        timeout: 86_400,
      }),
      factory.createHashIp({
        name: "suspicious",
        timeout: 604_800,
      }),
    ]);
    for await (const l of logs) {
      const userAgent = testUserAgent(l);
      if (userAgent !== null) {
        await userAgentSet.add({
          entry: l.remoteIp,
          comment: userAgent,
        });
        continue;
      }
      const patterns = Array.from(testPath(l));
      if (patterns.length > 0) {
        await suspiciousSet.add({
          entry: l.remoteIp,
        });
      }
    }
  }

  usage(): string {
    return `Usage: ${this.#args0} ban
  [--help]
  [...PATHS]

========================= OPTIONS =========================
  --help    Show this help.
`;
  }
}
