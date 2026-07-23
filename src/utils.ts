export interface CliCommand {
  get arg0(): string;
  main(args: string[]): Promise<void>;
  usage(): string;
}

export type MutableTuple<T extends readonly unknown[]> = [...T];

export type StringArray<T extends unknown[]> = {
  [K in keyof T]: string;
};

export const PATHS_CSV_COLUMNS = Object.freeze(
  [
    "log",
    "date",
    "method",
    "hostname",
    "path",
    "remoteIp",
    "statusCode",
    "statusText",
  ] as const,
);
export type PathsCsvColumns = typeof PATHS_CSV_COLUMNS[number];
export type PathsCsvRecord = Record<PathsCsvColumns, string>;

export const IA_CRAWLERS_AGENTS = Object.freeze([
  "ClaudeBot",
  "GPTBot",
  "OAI-SearchBot",
]);

export function urlPatterns(...pathnames: string[]): URLPattern[] {
  return pathnames.map((pathname) => new URLPattern({ pathname }));
}

export const SUSPICIOUS_PATHS = Object.freeze(urlPatterns(
  // ASP.net
  "/trace.axd*",
  "/debug*",
  // Java things
  "/login.action",
  "/s*",
  "/telescope*",
  "/actuator*",
  "/console*",
  "/WEB-INF*",
  // Docker registry
  "/v2/_catalog",
  // Microsoft Exchange
  "/ecp*",
  // Microsoft SharePoint
  "/ms-themes.php",
  // Generic API
  "/graphql",
  "/api",
  "/api/graphql",
  "/graphql/api",
  "/api/gql",
  "*config*",
  "/credentials.json",
  "/docker-compose.yml",
  "/test*",
  "*.bash*",
  "*env*",
  "/info.*",
  // JavaScript things
  "/@vite*",
  "/node_modules*",
  "/.*.*",
  // PHP things
  "/php-info*",
  "/phpinfo*",
  "/xmlrpc.php",
  "/app_dev.php*",
  "/vendor/phpunit*",
  // Laravel
  "/_ignition*",
  // Wordpress
  "/wp-login*",
  "/wp-config*",
  "/wp-json*",
  "//*",
  "*wp-includes*",
  "/feed/",
  "/wp-config.php",
  // Joomla
  "/administrator*",
  // Bot
  "/_rNd9xZ7kL3",
  "/PL-1466-160526/",
  "/about",
  // CPanel
  "/___proxy_subdomain_whm*",
  "/___proxy_subdomain_cpanel*",
  // EnhanceCP
  "/enhancecp*",
  // AhmadScanner
  "/AhmadScanner*",
  // Terraform
  "/terraform*",
));
