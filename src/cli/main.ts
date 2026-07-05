import { CliCommand } from "../utils.ts";
import { analyse, AnalyseCommand } from "./analyse.ts";
import { ban, BanCommand } from "./ban.ts";
import { logs, LogsCommand } from "./logs.ts";

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

async function runCommand(command: CliCommand, args: string[]): Promise<number> {
  try {
    await command.main(args);
  } catch (error) {
    console.error(command.usage());
    console.error(error);
    return 2;
  }
  return 0;
}

export async function main(args: string[]): Promise<number> {
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
      return 0;

    default:
      console.error(usage());
      return 1;
  }
}

if (import.meta.main) {
  Deno.exit(await main(Deno.args.slice()));
}
