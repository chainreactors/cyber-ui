# @cyber/aop

Provider-neutral Agent Orchestration Protocol types and namespace codecs.
Protobuf is the source of truth; generated TypeScript is the public package.

`fixtures/interop.json` is the shared Go/Python/TypeScript binary + protobuf JSON
fixture. It covers `Envelope -> Any<aop.ProtocolMessage> -> Event -> typed Any`
and includes lossless OpenAI/Anthropic raw payload samples.

```ts
import { EventSchema } from '@cyber/aop'
import { fromJson } from '@bufbuild/protobuf'

const event = fromJson(EventSchema, JSON.parse(sseData))
if (event.payload.case === 'message') {
  console.log(event.payload.value.content)
}
```

Validate and regenerate:

```powershell
pnpm install
pnpm --filter @cyber/aop generate
pnpm --filter @cyber/aop lint
pnpm --filter @cyber/aop typecheck
```

See [SPEC.md](SPEC.md) for lifecycle and compatibility requirements.
