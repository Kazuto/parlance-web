# Parlance

Parlance is a self-hosted translation management app. Keep the texts of your
applications as keys, translate them into any number of languages side by side,
keep wording consistent with a glossary, and import and export the files your
framework uses.

This repository holds the web app (Nuxt). The API lives in
[parlance-server](https://github.com/Kazuto/parlance-server); the UI components come
from [`@thkzt/eunoia`](https://www.npmjs.com/package/@thkzt/eunoia).

## Features

- **Entries:** every text is an entry with a key (`auth.login.title`), an optional
  description for translators, and one translation per language.
- **Editor:** edit all languages of an entry side by side. Filter by scope, language
  and missing translations, search keys and texts, and see each entry's history.
  Changes stay drafts until you save them, one entry or all at once.
- **Scopes:** group entries, for example by app or area (`frontend`, `mails`), and
  change the scopes of many entries at once.
- **Glossary:** define terms and their translation per language. The editor shows
  the terms that occur in a text, so the same word is translated the same way.
- **Languages:** add languages, choose the default (source) language, and name each
  language in every language. Missing names can be filled in automatically.
- **Import and export:** flat or nested JSON, PHP arrays (Laravel), gettext PO, and
  ZIP files with one file per language.
- **Machine translation (optional):** suggestions from a self-hosted
  [Hy-MT2](https://github.com/Tencent-Hunyuan/Hy-MT2) model, for one entry or many.
  Suggestions are drafts to review, never saved on their own.
- **Users and roles:** permissions per role, down to who may use machine translation.
- **Single sign-on:** sign in with OpenID Connect providers such as Keycloak,
  Authentik or Microsoft Entra ID, next to email and password.
- **Webhooks:** tell your CI, chat or other services when translations await
  approval, are approved or rejected, entries are added, or tasks end: right away
  or as a digest on a schedule, as JSON or as Slack or Discord messages.
- **Interface languages:** English, German, French and Spanish; everyone picks theirs
  under Settings.

## Running Parlance

Parlance needs the API server, PostgreSQL and S3-compatible storage (for avatars).
The server repository's Docker Compose setup starts all three, plus the optional
translation model.

### Try it locally

Check out both repositories next to each other:

```bash
git clone https://github.com/Kazuto/parlance-server.git server
git clone https://github.com/Kazuto/parlance-web.git web

# API, PostgreSQL and MinIO on http://localhost:8080
cd server && make dev

# Web app on http://localhost:3000
cd ../web && docker compose up -d
```

Open <http://localhost:3000>. On the first start Parlance asks for the details of
the first administrator; after that, sign in with them.

The API only answers web apps it knows. It allows `http://localhost:3000` by
default; for any other address, add it to `CORS_ALLOWED_ORIGINS` on the server
(see the server README).

### Production

Both repositories publish Docker images on version tags:

- `ghcr.io/kazuto/parlance-frontend` serves the web app on port 3000.
- `ghcr.io/kazuto/parlance-api` serves the API on port 8080.

The web app has one setting:

| Variable                   | Default                 | Description                                |
| -------------------------- | ----------------------- | ------------------------------------------ |
| `NUXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | Address of the API, as the browser sees it |

For the server's settings, see the
[server README](https://github.com/Kazuto/parlance-server#configuration).

## Using Parlance

### First steps

1. **Languages:** add the languages you translate into and pick the default
   language, the one you write the source texts in.
2. **Scopes (optional):** create scopes to group entries, for example per app.
3. **Entries:** create entries one by one, or import existing translation files under
   Import / export.
4. **Users:** invite translators and give them a role.

### Translating

The editor lists the entries on the left and the selected entry's languages on the
right. Choose which languages to show with the language filter; the default
language always comes first, since it is the source.

- **Missing translations:** filter by "missing translations" to work through
  what is left.
- **Drafts:** edits stay drafts until saved. "Save changes" saves the open entry,
  "Save all" every entry with drafts. Leaving the page with drafts asks first.
- **Entry menu (⋯):** fill the empty languages with machine translation, copy the
  default text into them, edit the entry, or delete it.
- **Translation context:** the side panel shows the glossary terms that occur in a
  text, approved translations of similar default texts (the translation memory) and
  the history of every language.
- **Outdated translations:** when a default text changes, its translations are
  marked outdated. The side panel shows the text before and after the change;
  confirm a translation that still fits, or edit it.
- **Several entries:** tick entries in the list to change their scopes or to
  machine-translate them all.

### Import and export

Under Import / export:

- **JSON:** flat (`{"auth.login": "Log in"}`) or nested
  (`{"auth": {"login": "Log in"}}`) files. Exports are flat.
- **PHP:** Laravel-style `return [...]` arrays.
- **PO:** gettext files where `msgid` is the key and `msgstr` the translation.
- **ZIP:** all languages at once, one file per language.

An import goes into one language and can add the imported entries to scopes. The
import mode decides what happens to existing entries: create or update, create
only, update only, or replace all. Every import shows a preview first: what it adds,
changes and removes, with the old and new text, and how many translations in other
languages it would mark outdated. Nothing changes until you confirm.

### Your account

Under **Settings → Your account**, everyone can change their own name, email
address, picture and password, and their language, whatever their role.

### Users, roles and permissions

A role is a set of permissions, such as `read_entry`, `update_entry` or
`delete_locale`. Parlance starts with an admin role that has every permission;
create roles for everyone else, for example translators who may edit entries but
not delete languages. Buttons for actions a user may not take are hidden.

### Single sign-on

Under **Settings → Single sign-on**, add your identity provider with its issuer URL,
client ID and secret, and register the redirect URI shown there with the provider.
Choose whether people without an account get one, and with which role, or whether
only existing users may sign in; they are matched by email. The sign-in page then
offers "Sign in with …" next to the password. See
[Single sign-on](https://github.com/Kazuto/parlance-server#single-sign-on) in the
server README for the details.

### Machine translation

Machine translation needs a server running a Hy-MT2 model. The server repository's
Docker Compose file includes one. It runs on a CPU or an integrated GPU and needs
no NVIDIA card; see
[Machine translation](https://github.com/Kazuto/parlance-server#machine-translation)
in the server README.

1. Under **Settings → Machine translation**, add the server's address, for example
   `http://translator:8080/v1`, and press **Test**.
2. Give the roles that may use it the permission `use_machine_translation`.
   Translating is slow on small hardware, so not everyone should be able to start
   it.
3. In the editor, choose **AI-translate empty languages** in an entry's menu, or tick
   several entries and choose **AI translate**.

The results appear as drafts in the empty languages. Check them, especially those
marked "Check": a placeholder may be missing or the plural forms may not match.
Then save.

### Webhooks

Under **Webhooks**, add the address of the service to notify and pick the events it
gets. For Slack, Mattermost or Discord, choose their format, which posts a short
message; Parlance picks it when you paste a Slack or Discord address. For your own
services, keep JSON, which carries every detail, and generate a signing secret for
the receiving service, so it can check that requests come from Parlance; the secret
is shown only until you save. To keep a channel calm, let the webhook collect its
events and send them as an hourly, daily or weekly digest instead of right away. **Send test** posts a ping and shows the answer. Each webhook lists its deliveries with what was
sent and what came back; failed ones are tried again for a few hours, and any can
be sent again by hand.

The events, the request format and how to check signatures are described under
[Webhooks](https://github.com/Kazuto/parlance-server#webhooks) in the server README.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup, checks, tests,
UI translations and the generated API schemas.

## License

GNU General Public License, see [LICENSE](LICENSE).
