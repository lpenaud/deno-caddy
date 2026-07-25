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
