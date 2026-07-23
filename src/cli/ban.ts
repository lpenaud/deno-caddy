import { parseArgs } from "@std/cli";
import { CaddyLog, caddyLog } from "../caddy.ts";
import { FilterStream } from "../io.ts";
import { CliCommand, IA_CRAWLERS_AGENTS, SUSPICIOUS_PATHS } from "../utils.ts";

type BanFilter = (l: CaddyLog) => boolean;

interface BanArgs {
  help: boolean;
  filter: BanFilter;
  infiles: string[];
}

function mapFilterArg(filter: string | undefined): BanFilter {
  if (filter === undefined) {
    return allFilter;
  }
  const f = BAN_FILTERS[filter as keyof typeof BAN_FILTERS];
  if (f === undefined) {
    throw new Error(`Unkown filter '${filter}'`);
  }
  return f;
}

function parseBanArgs(args: string[]): BanArgs {
  const {
    help,
    filter,
    _: infiles,
  } = parseArgs(args, {
    boolean: ["help"],
    string: ["filter"],
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
      filter: allFilter,
    };
  }
  return {
    help,
    filter: mapFilterArg(filter),
    infiles: infiles.map((v) => v.toString()),
  };
}

const iaFilter: BanFilter = ({ userAgent }: CaddyLog) => {
  for (const crawler of IA_CRAWLERS_AGENTS) {
    if (userAgent.includes(crawler)) {
      return true;
    }
  }
  return false;
};

const suspiciousFilter: BanFilter = ({ url }: CaddyLog) => {
  for (const re of SUSPICIOUS_PATHS) {
    if (re.test(url)) {
      return true;
    }
  }
  return false;
};

const allFilter: BanFilter = (l: CaddyLog) =>
  iaFilter(l) ||
  suspiciousFilter(l);

const BAN_FILTERS = Object.freeze({
  IA: iaFilter,
  SUSPICIOUS: suspiciousFilter,
  ALL: allFilter,
});

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
    const { help, infiles, filter } = parseBanArgs(
      args,
    );
    if (help) {
      console.log(this.usage());
      return;
    }
    const readable = await caddyLog(infiles);
    await readable.pipeThrough(new FilterStream(filter))
      .pipeThrough(new BanOutputStream())
      .pipeThrough(new TextEncoderStream())
      .pipeTo(Deno.stdout.writable, { preventClose: true });
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
