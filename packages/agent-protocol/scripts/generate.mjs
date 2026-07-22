import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { compile } from "json-schema-to-typescript"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const schemas = [
  ["types/image-source.schema.json", "image-source.ts"],
  ["types/message-part.schema.json", "message-part.ts"],
  ["events/session.start.schema.json", "session-start.ts"],
  ["events/session.end.schema.json", "session-end.ts"],
  ["events/message.schema.json", "message.ts"],
  ["events/message.delta.schema.json", "message-delta.ts"],
  ["events/tool.call.schema.json", "tool-call.ts"],
  ["events/tool.result.schema.json", "tool-result.ts"],
  ["events/usage.schema.json", "usage.ts"],
  ["events/turn.start.schema.json", "turn-start.ts"],
  ["events/turn.end.schema.json", "turn-end.ts"],
  ["events/error.schema.json", "error.ts"],
  ["events/status.schema.json", "status.ts"],
  ["ext/aop.schema.json", "ext-aop.ts"],
  ["ext/eval.schema.json", "ext-eval.ts"],
  ["ext/compact.schema.json", "ext-compact.ts"],
  ["ext/ioa.schema.json", "ext-ioa.ts"],
  ["ext/delegation.schema.json", "ext-delegation.ts"],
]

const outDir = resolve(root, "src/gen")
await mkdir(outDir, { recursive: true })
for (const [input, output] of schemas) {
  const schema = JSON.parse(await readFile(resolve(root, "schema", input), "utf8"))
  const source = await compile(schema, schema.title ?? "Schema", {
    bannerComment: "/* eslint-disable */\n/** Generated from JSON Schema. DO NOT EDIT. */",
    cwd: resolve(root, "schema", dirname(input)),
    style: { singleQuote: true, semi: false },
    unreachableDefinitions: true,
  })
  await writeFile(resolve(outDir, output), source)
}
