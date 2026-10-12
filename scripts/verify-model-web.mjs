import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as ort from "../public/models/runtime/ort.wasm.min.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
ort.env.wasm.numThreads = 1;
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "public/models/coastseg-rgb.json"), "utf8"),
);
const inputBytes = fs.readFileSync(
  path.join(root, ".model-qa/model-input.f32"),
);
const input = new Float32Array(
  inputBytes.buffer.slice(
    inputBytes.byteOffset,
    inputBytes.byteOffset + inputBytes.byteLength,
  ),
);
const referenceBytes = fs.readFileSync(
  path.join(root, ".model-qa/model-logits.f32"),
);
const reference = new Float32Array(
  referenceBytes.buffer.slice(
    referenceBytes.byteOffset,
    referenceBytes.byteOffset + referenceBytes.byteLength,
  ),
);
const started = Date.now();
const session = await ort.InferenceSession.create(
  fs.readFileSync(path.join(root, "public/models/coastseg-rgb.onnx")),
  { executionProviders: ["wasm"] },
);
const results = await session.run({
  [manifest.input_name]: new ort.Tensor("float32", input, [1, 3, 512, 512]),
});
const logits = results[manifest.output_name].data;
let maxError = 0,
  agreed = 0;
const count = 128 * 128;
for (let i = 0; i < logits.length; i++)
  maxError = Math.max(maxError, Math.abs(logits[i] - reference[i]));
for (let i = 0; i < count; i++) {
  let a = 0,
    b = 0;
  for (let c = 1; c < 4; c++) {
    if (logits[c * count + i] > logits[a * count + i]) a = c;
    if (reference[c * count + i] > reference[b * count + i]) b = c;
  }
  if (a === b) agreed++;
}
if (maxError > 1e-3 || agreed / count < 0.999)
  throw new Error(`WASM parity failed: ${maxError}, ${agreed / count}`);
console.log(
  JSON.stringify({
    engine: "ONNX Runtime Web WASM",
    elapsed_ms: Date.now() - started,
    max_logit_error: maxError,
    label_agreement: agreed / count,
  }),
);
await session.release();
