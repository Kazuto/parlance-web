# Parlance

A powerful, developer-friendly translation management platform that streamlines localization workflows with AI-powered translations, custom terminology control, and flexible export options.

## Features

### Core Functionality

- **Key-Based Translation System** - Organize translations with unique identifiers
- **Multi-Locale Support** - Manage unlimited languages with ease
- **AI-Powered Translations** - Integrate with DeepL API or custom AI models for automated translations
- **Custom Terminology** - Define glossaries to ensure consistent translations (e.g., "Mobile phone" → "Handy" in German)
- **Scopes & Organization** - Group translations by context (frontend, validation, errors, etc.)

### Developer Experience

- **Multiple Export Formats** - Export to Laravel, Vue i18n, and other popular frameworks
- **Version Control** - Complete history tracking for all translation changes
- **Search & Filter** - Quickly find translations across locales and scopes

### Team Collaboration

- **Role-Based Access Control** - Granular permissions for admins, translators, and reviewers
- **Audit Trail** - Track who changed what and when
- **Review Workflow** - Built-in approval process for translation quality

## Quick Start

### Prerequisites

- Node.js 24

### Installation

```bash
# Clone the repository
git clone https://github.com/criticaldevs/parlance.git
cd parlance

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev
```

## Usage

_To be added_

## UI translations

The app uses `@nuxtjs/i18n` with an English-only catalog in
`i18n/locales/en.json`. Routes have no locale prefix and browser-language detection
is disabled. There is no language switcher.

Catalogs use flat dotted keys (`"entries.create": "Create Entry"`) and string
values, making them directly compatible with Parlance's JSON import/export.
Vue I18n's `flatJson` option is enabled to resolve these keys.

Use `const { t } = useI18n()` in components and composables, with semantic keys
such as `t("common.saveChanges")`. Keep complete sentences in the catalog and pass
dynamic values as named parameters, for example
`t("entries.created", { key: entryKey })`. Count-dependent messages use Vue I18n
plural forms. API-provided content (entry keys, language names, translations, and
server error messages) is displayed as returned by the backend.

## Generating API schemas

The backend protobuf definitions are the source of truth for the API contract.
With the backend checked out at `../server`, install Go (the version in
`server/go.mod`) and the [Buf CLI](https://buf.build/docs/installation/), then run:

```bash
npm run schemas:generate
```

This generates Zod 4 schemas and TypeScript types for every protobuf message and
enum in `app/lib/api/schemas/parlance/v1/`. Commit the generated files after changing
the protos. To check for drift in CI, run `npm run schemas:check`; it generates
into a temporary directory and fails if the committed schemas differ. CI needs
the sibling backend checkout as well as Go, Buf, and frontend dependencies.

```ts
import {
  CreateEntryRequestSchema,
  type CreateEntryRequest,
} from "~/lib/api/schemas/parlance/v1";

const input: CreateEntryRequest = { key: "welcome", scopeIds: ["scope-id"] };
CreateEntryRequestSchema.parse(input);
```

API endpoints, application consumers, and the public `~/lib/api` schema exports
use these generated schemas by default. Import from `schemas/parlance/v1` or a
specific module such as `schemas/parlance/v1/EntrySchema`. The generated modules
retain the `MessageNameSchema` and `MessageName` naming convention and include
services such as scopes, imports, and exports.

The `schemas/parlance/` directory contains generated files only and is cleaned on
regeneration. Handwritten form validation belongs outside this directory.

### Wire format and validation

- Field names use protobuf JSON names (`scope_ids` becomes `scopeIds`).
- Fields are optional and nullable: ProtoJSON omits default values and accepts
  `null` as unset. Schemas validate the wire shape without inserting defaults.
  For example, an empty list response may be `{}`, so use `response.entries ?? []`.
- Maps use string keys, bytes use base64 strings, enums accept their protobuf names
  or integer values, and 64-bit integers use decimal strings to avoid precision loss.
- Recursive messages use lazy Zod getters; explicit `oneof` groups allow at most
  one non-null field.
- Plain protobuf strings do not carry email, timestamp, or password constraints.
  Add business/form validation in handwritten schemas using `.extend()`, for example:

  ```ts
  const RegisterFormSchema = RegisterRequestSchema.extend({
    email: z.email(),
    password: z.string().min(8),
    name: z.string().min(1),
  });
  ```

The local plugin lives in `server/cmd/protoc-gen-zod/` and uses protobuf descriptors,
so it does not parse Go source or require a remote generation service. It supports
the types currently used by this API. External message types (including Google's
well-known types, which have special JSON representations) require adding explicit
support to the plugin before use; unsupported external types fail generation.

## Database Schema

The system uses a normalized database structure:

- **entries** - Translation keys/identifiers
- **localizations** - Locale-specific translations
- **terminologies** - Custom terminology definitions
- **definitions** - Locale-specific terminology translations
- **scopes** - Organization categories (frontend, validation, etc.)
- **locales** - Supported languages
- **users, roles, permissions** - Access control

Full schema documentation available in `/docs/database-schema.md`

## 🔌 API Integration

### DeepL Integration

_To be added_

### Custom AI Models

_To be added_

## Roadmap

- [ ] Real-time collaboration
- [ ] Translation memory suggestions
- [ ] Automated quality checks
- [ ] Figma/Sketch plugin integration
- [ ] Machine translation post-editing
- [ ] Context screenshots for translators
- [ ] Slack/Discord notifications

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the GNU General Public License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by modern translation management tools
- Built with Nuxt.js, TypeScript and Tailwind CSS

## Contact

- Project Link: [https://github.com/criticaldevs/parlance](https://github.com/criticaldevs/parlance)
- Issues: [https://github.com/criticaldevs/parlance/issues](https://github.com/criticaldevs/parlance/issues)

---

Made with ❤️ by developers, for developers
