import { mergeReadableStreams, TextLineStream, toText } from "@std/streams";
import { JsonParseStream } from "@std/json/parse-stream";
import { JsonValue } from "@std/json";
import * as stdPath from "@std/path";

export async function* fileTree(paths: string[]): AsyncGenerator<string> {
  if (paths.length === 0) {
    return;
  }
  for (const p of paths) {
    const stat = await Deno.stat(p);
    if (stat.isDirectory) {
      const children = await Array.fromAsync(Deno.readDir(p));
      yield* fileTree(children.map((v) => stdPath.join(p, v.name)));
      continue;
    }
    yield p;
  }
}

export function jsonStreamFactory(
  readable: ReadableStream<Uint8Array>,
): ReadableStream<JsonValue> {
  return readable.pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream())
    .pipeThrough(new JsonParseStream());
}

export async function openWritable(
  path: string | undefined,
): Promise<WritableStream<Uint8Array>> {
  if (path === undefined || path === "-") {
    return Deno.stdout.writable;
  }
  const f = await Deno.open(path, {
    create: true,
    write: true,
  });
  return f.writable;
}

export async function openFiles<T>(
  paths: string[],
  streamFactory: (readable: ReadableStream<Uint8Array>) => ReadableStream<T>,
): Promise<ReadableStream<T>> {
  if (paths.length === 0) {
    return streamFactory(Deno.stdin.readable);
  }
  const streams = await Promise.all(paths.map((p) => Deno.open(p)));
  return mergeReadableStreams(...streams.map((f) => streamFactory(f.readable)));
}

export function toTexts(...buffers: Uint8Array[]): Promise<string> {
  return toText(ReadableStream.from(buffers));
}

export class FilterStream<T> extends TransformStream<T, T> {
  #predicate: (chunk: T) => boolean;

  constructor(predicate: (chunk: T) => boolean) {
    super({
      transform: (chunk, controller) => this.#transform(chunk, controller),
    });
    this.#predicate = predicate;
  }

  #transform(chunk: T, controller: TransformStreamDefaultController<T>) {
    if (this.#predicate(chunk)) {
      controller.enqueue(chunk);
    }
  }
}
