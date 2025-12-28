# Publishing Guide: Better Auth Next.js Plugin

This guide explains how to publish this Claude Code plugin for others to use.

## 📦 Plugin Structure

```
better-auth-nextjs-plugin/
├── .claude-plugin/
│   ├── plugin.json          # Plugin metadata
│   └── marketplace.json     # Marketplace configuration
├── skills/
│   └── better-auth-nextjs/
│       ├── SKILL.md         # Main skill (with frontmatter)
│       ├── README.md        # Quick start
│       ├── QUICK_REFERENCE.md
│       └── env.example      # Environment template
├── LICENSE                  # MIT License
├── README.md               # Plugin documentation
└── PUBLISHING.md           # This file
```

## 🚀 Publishing Options

### Option 1: GitHub Marketplace (Recommended)

This is the easiest way for users to install your plugin.

#### Step 1: Create GitHub Repository

```bash
# Create a new repository on GitHub
# Name: claude-better-auth-skill
# Description: Production-ready Better Auth plugin for Next.js 16

# Clone and prepare
git clone https://github.com/bashiraziz/claude-better-auth-skill.git
cd claude-better-auth-skill
```

#### Step 2: Copy Plugin Files

```bash
# Copy the entire plugin directory to the repository root
cp -r .claude/plugins/better-auth-nextjs-plugin/* ./
```

#### Step 3: Commit and Push

```bash
git add .
git commit -m "Initial release: Better Auth Next.js Plugin v1.0.0"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

#### Step 4: Share Installation Instructions

Users can now install with:

```bash
# In Claude Code
/plugin marketplace add bashiraziz/claude-better-auth-skill
/plugin install better-auth-nextjs@better-auth-marketplace
```

### Option 2: GitLab, Bitbucket, or Self-Hosted

The plugin works with any Git hosting:

```bash
/plugin marketplace add https://gitlab.com/yourname/better-auth-plugin.git
```

### Option 3: Local Testing

Test before publishing:

```bash
# From your project directory
/plugin marketplace add ./.claude/plugins/better-auth-nextjs-plugin
/plugin install better-auth-nextjs@better-auth-marketplace
```

## ✅ Pre-Publishing Checklist

- [ ] All skill files have proper frontmatter with `name` and `description`
- [ ] `plugin.json` has correct version, author, and repository info
- [ ] `marketplace.json` is properly configured
- [ ] LICENSE file is included (MIT recommended)
- [ ] README.md has clear installation and usage instructions
- [ ] All code examples are tested and working
- [ ] Environment variable template is included
- [ ] Repository URL is correct in plugin.json

## 📝 Versioning

Follow semantic versioning (semver):

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, backwards compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes

Update version in:
1. `.claude-plugin/plugin.json`
2. `.claude-plugin/marketplace.json`
3. Git tag
4. README.md

## 🔄 Updating the Plugin

```bash
# Update version numbers
vim .claude-plugin/plugin.json
vim .claude-plugin/marketplace.json

# Commit changes
git add .
git commit -m "Release v1.1.0: Add new features"
git tag v1.1.0
git push origin main
git push origin v1.1.0
```

Users update with:
```bash
/plugin update better-auth-nextjs@better-auth-marketplace
```

## 📢 Promotion

Share your plugin:

1. **GitHub README** - Add badges and screenshots
2. **Social Media** - Tweet about it with #ClaudeCode
3. **Blog Post** - Write about the implementation
4. **Better Auth Discord** - Share in community
5. **Dev.to / Hashnode** - Tutorial article

## 🐛 Support and Issues

Encourage users to:
- Open GitHub issues for bugs
- Submit PRs for improvements
- Star the repository if they find it helpful

## 📊 Usage Tracking

Consider adding:
- GitHub Stars count in README
- Download/installation statistics
- User testimonials
- Example projects using the skill

## 🔒 Security

Before publishing:
- Remove any API keys or secrets
- Ensure env.example has no real credentials
- Review all code for security vulnerabilities
- Test with latest Next.js and Better Auth versions

## 📄 Documentation

Essential docs to include:
- ✅ README.md with installation
- ✅ SKILL.md with complete guide
- ✅ QUICK_REFERENCE.md with examples
- ✅ LICENSE file
- ✅ env.example template
- ⬜ CHANGELOG.md (recommended)
- ⬜ CONTRIBUTING.md (optional)

## 🎯 Success Metrics

Track:
- GitHub stars and forks
- Issues and PRs
- User feedback
- Download/install count (if available)
- Better Auth version compatibility

## 🤝 Community

Engage with users:
- Respond to issues promptly
- Accept helpful PRs
- Update for new Next.js/Better Auth releases
- Share user success stories

---

**Ready to Publish?**

1. Create GitHub repository: `claude-better-auth-skill`
2. Copy plugin files to root
3. Update URLs in plugin.json
4. Commit, tag, and push
5. Share installation instructions!

Users will be able to install with:
```bash
/plugin marketplace add bashiraziz/claude-better-auth-skill
/plugin install better-auth-nextjs
```

Good luck! 🚀
