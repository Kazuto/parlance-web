import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = resolve(web, "../server");
const output = join(web, "app/lib/api/schemas/parlance");
const check = process.argv.includes("--check");
const temporary = check
  ? mkdtempSync(join(tmpdir(), "parlance-schemas-"))
  : null;

function files(directory, prefix = "") {
  return readdirSync(join(directory, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const relative = join(prefix, entry.name);
      return entry.isDirectory() ? files(directory, relative) : [relative];
    })
    .sort();
}

try {
  const destination = temporary ?? output;
  const template = check
    ? JSON.stringify({
        version: "v2",
        clean: true,
        plugins: [
          {
            local: ["go", "run", "./cmd/protoc-gen-zod"],
            out: destination,
            opt: ["strip_prefix=parlance/"],
            strategy: "all",
          },
        ],
      })
    : "buf.gen.web.yaml";
  const result = spawnSync("buf", ["generate", "--template", template], {
    cwd: server,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Buf schema generation failed");

  const generated = files(destination);
  for (const file of generated) {
    const formatted = await format(
      readFileSync(join(destination, file), "utf8"),
      {
        parser: "typescript",
      },
    );
    writeFileSync(join(destination, file), formatted);
  }

  if (check) {
    const existing = files(output);
    if (
      JSON.stringify(existing) !== JSON.stringify(generated) ||
      generated.some(
        (file) =>
          !readFileSync(join(output, file)).equals(
            readFileSync(join(destination, file)),
          ),
      )
    ) {
      throw new Error(
        "Generated schemas are stale. Run npm run schemas:generate.",
      );
    }
    console.log("Generated schemas are up to date.");
  } else {
    console.log(`Generated ${generated.length} schema files.`);
  }
} finally {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
