import { CaddyLogParseStream } from "./caddy.ts";
import { jsonStreamFactory, openFiles } from "./streams.ts";

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

async function logs(args: string[]): Promise<number> {
  const stream = (await openFiles(args, (r) => jsonStreamFactory(r)))
    .pipeThrough(new CaddyLogParseStream());
  const tsFormat = new Intl.DateTimeFormat("fr-FR", {
    timeStyle: "medium",
  });
  for await (const record of stream) {
    console.log(
      "%s %s %s %c%s%c %s",
      tsFormat.format(record.ts),
      record.method,
      record.url.href,
      `color: ${getHttpStatusColor(record.status.code)};`,
      record.status.code,
      `color: inherit;`,
      record.remoteIp,
    );
  }
  return 0;
}

function usage() {
  const arg0 = import.meta.filename ?? import.meta.url;
  return `Usage: ${arg0} COMMAND

========== COMMANDS ==========
  - logs    Show Caddy logs.
  - help    Show this help.
`;
}

export async function main(args: string[]): Promise<number> {
  switch (args.shift()) {
    case "logs":
      await logs(args);
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
  await main(Deno.args.slice());
}
