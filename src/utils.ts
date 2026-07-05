export interface CliCommand {
  get arg0(): string;
  main(args: string[]): Promise<void>;
  usage(): string;
}
