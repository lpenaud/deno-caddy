import { mergeReadableStreams, TextLineStream } from "@std/streams";
import { JsonParseStream } from "@std/json/parse-stream";
import { JsonValue } from "@std/json";

export function jsonStreamFactory(
  readable: ReadableStream<Uint8Array>,
): ReadableStream<JsonValue> {
  return readable.pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream())
    .pipeThrough(new JsonParseStream());
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
