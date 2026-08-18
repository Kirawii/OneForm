import { mergePdfPayload } from "./pdf-merge-core.mjs";

self.addEventListener("message", async event => {
  try {
    const bytes = await mergePdfPayload(event.data, progress => {
      self.postMessage({ type: "progress", progress });
    });
    const output = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    self.postMessage({ type: "complete", bytes: output }, [output]);
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
