import fs from "node:fs";
import crypto from "node:crypto";
import ts from "typescript";
const source = ts.transpileModule(fs.readFileSync("lib/altimetry.ts", "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { parseAltimetry, levelForecast } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const raw = fs.readFileSync("public/datasets/caspian-nasa-000270.txt");
const data = parseAltimetry(raw.toString());
data.sha256 = crypto.createHash("sha256").update(raw).digest("hex");
fs.writeFileSync(
  "public/datasets/caspian-altimetry.json",
  JSON.stringify(data),
);
for (const date of ["2026-11-12", "2027-01-01", "2027-04-01"])
  console.log(JSON.stringify({ date, result: levelForecast(data, date) }));
