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

