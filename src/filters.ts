import { CaddyLog } from "./caddy.ts";

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
  "/s/*",
  "/telescope*",
  "/actuator*",
  "/console*",
  "_vit_pvt",
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
  "/api/config",
  "/api/graphql",
  "/graphql/api",
  "/api/gql",
  "/config.(php|js)",
  "/credentials.json",
  // "/docker-compose.yml",
  "/secrets.json",
  "/test*",
  "*env*",
  "/info.*",
  "/server",
  "/server-status",
  "/app/config*",
  // JavaScript things
  "/@vite*",
  "/node_modules*",
  "/js/config.js",
  "*settings.js*",
  "*.(env|bash|sh|DS_Store|htpasswd|sql|py|npmrc|zip|key|log|yml)*",
  "*.(git|svn|vscode|aws|ssh)/**",
  "/.bash_history",
  "*backup.(tar.gz|zip)",
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

export type BanFilter = (l: CaddyLog) => boolean;

export const iaFilter: BanFilter = ({ userAgent }: CaddyLog) => {
  for (const crawler of IA_CRAWLERS_AGENTS) {
    if (userAgent.includes(crawler)) {
      return true;
    }
  }
  return false;
};

export const suspiciousFilter: BanFilter = ({ url }: CaddyLog) => {
  for (const re of SUSPICIOUS_PATHS) {
    if (re.test(url)) {
      return true;
    }
  }
  return false;
};

export const allFilter: BanFilter = (l: CaddyLog) =>
  iaFilter(l) ||
  suspiciousFilter(l);

const BAN_FILTERS = Object.freeze({
  IA: iaFilter,
  SUSPICIOUS: suspiciousFilter,
  ALL: allFilter,
});

export function getBanFilter(filter: string | undefined): BanFilter {
  if (filter === undefined) {
    return allFilter;
  }
  const f = BAN_FILTERS[filter as keyof typeof BAN_FILTERS];
  if (f === undefined) {
    throw new Error(`Unkown filter '${filter}'`);
  }
  return f;
}
