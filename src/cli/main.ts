import { CliCommand } from "../utils.ts";
import { AnalyseCommand } from "./analyse.ts";
import { BanCommand } from "./ban.ts";
import { LogsCommand } from "./logs.ts";

function getArg0() {
  return import.meta.filename ?? import.meta.url;
}

function usage() {
  return `Usage: ${getArg0()} COMMAND

============= COMMANDS =============
  - logs    Show Caddy logs.
  - analyse Show suspicious logs.
  - ban     Ban suspicious logs.
  - help    Show this help.
`;
}

async function runCommand(
  command: CliCommand,
  args: string[],
): Promise<number> {
  try {
    await command.main(args);
  } catch (error) {
    console.error(command.usage());
    console.error(error);
    return 2;
  }
  return 0;
}

export function main(args: string[]): Promise<number> {
  const arg0 = getArg0();
  switch (args.shift()) {
    case "logs":
      return runCommand(new LogsCommand(arg0), args);

    case "analyse":
      return runCommand(new AnalyseCommand(arg0), args);

    case "ban":
      return runCommand(new BanCommand(arg0), args);

    case "help":
      console.log(usage());
      return Promise.resolve(0);

    default:
      console.error(usage());
      return Promise.resolve(1);
  }
}

if (import.meta.main) {
  Deno.exit(await main(Deno.args.slice()));
}
