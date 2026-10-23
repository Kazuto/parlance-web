# Contributing to the Parlance web app

## Setup

You need [Bun](https://bun.sh) and the API running, see
[parlance-server](https://github.com/Kazuto/parlance-server). Keep the server checked
out next to this repository at `../server`: the API schemas are generated from it.

```bash
bun install
bun run dev        # http://localhost:3000
```

Or run the dev server in Docker with `docker compose up -d`.

The server can seed demo data (`make seed` in the server repository), with users
such as `admin@parlance.dev` / `admin123`.

### Working on eunoia at the same time

The UI components come from [`@thkzt/eunoia`](https://www.npmjs.com/package/@thkzt/eunoia).
To try changes before a release, `bun link` a checkout at `../eunoia`;
`docker-compose.override.yml` mounts it into the container. After changing eunoia,
build it (`bun run build` and `bun run build:types` there), clear Vite's cache
(`rm -rf node_modules/.cache/vite`) and restart the dev server.

Release eunoia and update its version here before pushing code that needs the
change, or CI and the Docker build fail.

## Checks

| Command              | What it does                               |
| -------------------- | ------------------------------------------ |
| `bun run test`       | Vitest, see [Tests](#tests)                |
| `bun run typecheck`  | `nuxt typecheck`                           |
| `bun run code:check` | ESLint and Prettier; `code:fix` fixes both |

The pre-commit hook runs lint-staged on the staged files, then the tests. CI runs
lint, type check and tests on pushes and pull requests to `main` and `develop`.

## Tests

- `test/unit/`: plain Node tests that only read files, e.g. that every permission
  the app checks exists.
- `test/nuxt/`: components and pages mounted in a running Nuxt app (happy-dom).
  No test reaches the network: `test/nuxt/helpers.ts` answers API calls, signs in a
  user with the given permissions and mounts pages.

```ts
loginAs([...VIEWER, "update_entry"]);
mockRpc("EntryService/ListEntries", { entries, pagination: pagination(1) });
const page = await mountPage(EntriesPage, { route: "/entries" });
```

A handler may return a promise, to check what shows while a request is running.

## UI translations

The app uses `@nuxtjs/i18n` with catalogs in `i18n/locales/` for English, German,
French and Spanish. Routes have no locale prefix and browser-language detection is
off: everyone picks their language under Settings.

- **Keys:** catalogs use flat dotted keys (`"entries.create": "Create entry"`) with
  string values, so they can be imported into Parlance itself. Vue I18n's
  `flatJson` option resolves them.
- **Every language:** add each new key to all four catalogs.
- **Usage:** `const { t } = useI18n()`, with semantic keys such as
  `t("common.saveChanges")`.
- **Sentences:** keep complete sentences in the catalog and pass dynamic values as
  named parameters, e.g. `t("entries.created", { key: entryKey })`. Count-dependent
  messages use Vue I18n plural forms.
- **API content:** entry keys, translations and server error messages are shown as
  the API returns them. Language names come from each locale's stored names in the
  UI language (`useLocaleName`).

## API schemas

The server's protobuf definitions are the source of truth for the API. With the
server at `../server`, Go (the version in `server/go.mod`) and the
[Buf CLI](https://buf.build/docs/installation/) installed, run:

```bash
bun run schemas:generate
```

This generates Zod 4 schemas and TypeScript types for every protobuf message and
enum in `app/lib/api/schemas/parlance/v1/`. Commit the generated files after
changing the protos. `bun run schemas:check` generates into a temporary directory
and fails if the committed schemas differ.

```ts
import {
  CreateEntryRequestSchema,
  type CreateEntryRequest,
} from "~/lib/api/schemas/parlance/v1";

const input: CreateEntryRequest = { key: "welcome", scopeIds: ["scope-id"] };
CreateEntryRequestSchema.parse(input);
```

Endpoints in `app/lib/api/endpoints/` use these schemas. Import from
`schemas/parlance/v1` or a single module such as
`schemas/parlance/v1/EntrySchema`. `schemas/parlance/` holds generated files only
and is cleaned on regeneration; handwritten form validation belongs elsewhere.

### Wire format

- **Field names:** protobuf JSON names (`scope_ids` becomes `scopeIds`).
- **Defaults are omitted:** ProtoJSON leaves out default values and accepts `null`
  as unset, and the schemas don't fill them in. An empty list may arrive as `{}`,
  so use `response.entries ?? []`, and a `false` boolean is missing, so treat a
  missing one as `false`.
- **Other types:** maps use string keys, bytes are base64 strings, enums accept
  their protobuf names or numbers, and 64-bit integers are decimal strings.
- **Recursion and oneof:** recursive messages use lazy Zod getters; a `oneof` group
  allows at most one non-null field.
- **No business rules:** protobuf strings carry no email, timestamp or password
  rules. Add those in handwritten schemas with `.extend()`:

  ```ts
  const RegisterFormSchema = RegisterRequestSchema.extend({
    email: z.email(),
    password: z.string().min(8),
    name: z.string().min(1),
  });
  ```

The generator is a local Buf plugin in `server/cmd/protoc-gen-zod/`. It reads
protobuf descriptors and supports the types the API currently uses. External
message types, including Google's well-known types, need support added to the
plugin first; generation fails on unsupported ones.
