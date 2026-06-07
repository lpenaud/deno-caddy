import { analyse } from "./analyse.ts";
import { logs } from "./logs.ts";

function getArg0() {
  return import.meta.filename ?? import.meta.url;
}

function usage() {
  return `Usage: ${getArg0()} COMMAND

============= COMMANDS =============
  - logs    Show Caddy logs.
  - analyse Show suspicious logs.
  - help    Show this help.
`;
}

export async function main(args: string[]): Promise<number> {
  switch (args.shift()) {
    case "logs":
      await logs(args);
      return 0;

    case "analyse":
      await analyse(getArg0(), args);
      return 0;

    case "help":
      console.log(usage());
      return 0;

    default:
      console.error(usage());
      return 1;
  }
}

if (import.meta.main) {
  Deno.exit(await main(Deno.args.slice()));
}
