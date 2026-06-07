import { caddyLog } from "../caddy.ts";

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

export async function logs(args: string[]): Promise<number> {
  const stream = await caddyLog(args);
  const tsFormat = new Intl.DateTimeFormat("fr-FR", {
    timeStyle: "medium",
    timeZone: "Europe/Paris",
  });
  for await (const record of stream) {
    console.log(
      "%s %s %s %c%s%c %s (%s)",
      tsFormat.format(record.ts),
      record.method,
      record.url.href,
      `color: ${getHttpStatusColor(record.status.code)};`,
      record.status.code,
      `color: inherit;`,
      record.remoteIp,
      record.userAgent,
    );
  }
  return 0;
}
