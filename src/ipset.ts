import { concatReadableStreams, toText } from "@std/streams";

async function runIpset(args: string[]): Promise<void> {
  console.log("ipset", ...args);
  const cmd = new Deno.Command("ipset", {
    args,
    stderr: "piped",
    stdin: "null",
    stdout: "piped",
  });
  const p = cmd.spawn();
  const [status, output] = await Promise.all([
    p.status,
    toText(concatReadableStreams(p.stdout, p.stderr)),
  ]);
  if (output.length > 0) {
    console.error(output);
  }
  if (status.success) {
    return;
  }
  throw new Error(`ipset exited with: ${status.code}`);
}

export class IpSetFactory {
  async createHashIp(
    { name, timeout }: { name: string; timeout?: number },
  ): Promise<IpsetHashIp> {
    const args = [
      "-exist",
      "create",
      name,
      "hash:ip",
    ];
    if (timeout) {
      args.push("timeout", `${timeout}`);
    }
    await runIpset(args);
    return new IpsetHashIp(name);
  }
}

export interface IpsetHashIpAddOptions {
  entry: string;
  comment?: string;
}

export class IpsetHashIp {
  #name: string;

  constructor(name: string) {
    this.#name = name;
  }

  async add({ entry, comment }: IpsetHashIpAddOptions): Promise<void> {
    const args: string[] = [
      "-exist",
      "add",
      this.#name,
      entry,
    ];
    if (comment) {
      args.push("comment", comment);
    }
    await runIpset(args);
  }
}
