// Run the actual browser worker math and model loader in Node, with file transport.
// This is a runtime test, not browser UI automation.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.self = globalThis;
self.location = { origin: "https://model.test" };
globalThis.fetch = async (input) => {
  const name = new URL(input, "https://model.test").pathname;
  return new Response(fs.readFileSync(path.join(root, "public", name)), {
    status: 200,
  });
};
const source = fs
  .readFileSync(path.join(root, "public/segmentation-worker.js"), "utf8")
  .replace(
    '"/models/runtime/ort.wasm.min.mjs"',
    JSON.stringify(
      pathToFileURL(path.join(root, "public/models/runtime/ort.wasm.min.mjs"))
        .href,
    ),
  )
  .replace(
    /new URL\(\s*"\/models\/runtime\/",\s*self.location.origin,?\s*\).href/,
    JSON.stringify(
      pathToFileURL(path.join(root, "public/models/runtime/")).href,
    ),
  );
const resultPromise = new Promise((resolve, reject) => {
  self.postMessage = (message) => {
    if (message.type === "result") resolve(message);
    if (message.type === "error") reject(new Error(message.message));
  };
});
await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const bytes = fs.readFileSync(path.join(root, ".model-qa/model-rgba.bin"));
await self.onmessage({
  data: { type: "segment", rgba: new Uint8ClampedArray(bytes) },
});
const r = await resultPromise;
if (
  r.labels.length !== 512 * 512 ||
  r.rgba.length !== 512 * 512 * 4 ||
  r.counts.reduce((a, b) => a + b, 0) !== 512 * 512
)
  throw new Error("Worker output dimensions invalid");
if (r.counts.some((x) => x < 0)) throw new Error("Worker counts invalid");
fs.writeFileSync(path.join(root, ".model-qa/worker-labels.bin"), r.labels);
console.log(
  JSON.stringify({
    worker: "actual segmentation-worker.js",
    model: r.manifest.version,
    counts: r.counts,
    elapsed_ms: r.elapsed_ms,
    checksum_verified: true,
  }),
);
