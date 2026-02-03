# @buckits/claude-statusline

<div align="center">

**The statusline Claude Code deserves.**

[![npm version](https://img.shields.io/npm/v/@buckits/claude-statusline.svg)](https://www.npmjs.com/package/@buckits/claude-statusline)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```
🤖 Opus 4.5 ($12.41) │ [████████████████████░░░░░░░░░░░░░░░░░░░⚡░░░░░░░░░░░] 80k/200k
📁 my-project main ✓ → origin/main ↑15
```

[Features](#features) • [Installation](#installation) • [Screenshots](#what-it-looks-like) • [GSD Compatible](#-gsd-compatible)

</div>

---

## Why This Statusline?

Claude Code's default statusline is... minimal. You deserve better.

**This statusline shows you everything you need at a glance:**

- 🎨 **Gradient progress bar** that flows green → yellow → red as you approach the limit
- ⚡ **Auto-compact threshold marker** so you know exactly when Claude will summarize
- 💰 **Session cost tracking** in real-time
- 🔀 **Full git integration** with branch, status, and ahead/behind tracking

## Features

### 🎨 Gradient Progress Bar

50 segments that smoothly transition through colors as your context fills up:

```
[██████████████████████████████░░░░░░░░░░⚡░░░░░░░░░░░]
 ↑ green        ↑ yellow      ↑ orange   ↑ threshold
```

### ⚡ Auto-Compact Threshold

A red lightning bolt marks exactly where Claude will auto-summarize (78%). No more surprises.

### 💰 Real-Time Cost

See your session cost update as you work: `($12.41)`

### 🔀 Git Status at a Glance

| Symbol | Meaning |
|--------|---------|
| `✓` | Clean - all committed |
| `●` | Unstaged changes |
| `✚` | Staged and ready |
| `●✚` | Both staged and unstaged |
| `↑5` | 5 commits ahead of remote |
| `↓2` | 2 commits behind remote |

### 📊 2-Line Dashboard

**Line 1:** AI Session Info
```
🤖 Opus 4.5 ($12.41) │ [████████████░░░░░░░░░░░░░░░░░░⚡░░░░░░░░░░░] 52k/200k
```

**Line 2:** Project & Git Info
```
📁 my-project feature/auth ●✚ → origin/feature/auth ↑3 ↓1
```

## Installation

```bash
npx @buckits/claude-statusline
```

That's it. The installer will:
1. Ask where to install (global or local)
2. Copy the statusline script
3. Configure your settings

### Options

```bash
# Interactive (recommended)
npx @buckits/claude-statusline

# Install globally for all projects
npx @buckits/claude-statusline --global

# Install for current project only
npx @buckits/claude-statusline --local

# Replace existing statusline
npx @buckits/claude-statusline --global --force

# Uninstall
npx @buckits/claude-statusline --global --uninstall
```

## What It Looks Like

### Normal Usage (Green Zone)
```
🤖 Opus 4.5 ($2.15) │ [██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⚡░░░░░░░░░░░] 20k/200k
📁 my-app main ✓ → origin/main
```

### Getting Busy (Yellow Zone)
```
🤖 Opus 4.5 ($8.42) │ [██████████████████████████░░░░░░░░░░░░░░⚡░░░░░░░░░░░] 52k/200k
📁 my-app feature/api ● → origin/feature/api ↑5
```

### Approaching Limit (Orange/Red Zone)
```
🤖 Opus 4.5 ($14.61) │ [████████████████████████████████████████⚡░░░░░░░░░░░] 80k/200k
📁 my-app main ✚ → origin/main ↑2 ↓1
```

## 🤝 GSD Compatible

This statusline works perfectly alongside [Get Shit Done (GSD)](https://www.npmjs.com/package/get-shit-done-cc)!

If you have GSD installed, the statusline will automatically show update notifications when a new GSD version is available.

```bash
# Install both for the ultimate Claude Code setup
npx @buckits/claude-statusline
npx get-shit-done-cc
```

## Requirements

- **Claude Code CLI** (obviously)
- **jq** - for JSON parsing ([install guide](https://stedolan.github.io/jq/download/))
- **Bash** - ships with macOS/Linux
- **Git** - for git status features (optional)

### Installing jq

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq

# Windows (via chocolatey)
choco install jq
```

## Manual Installation

If you prefer to install manually:

1. Copy `statusline.sh` to `~/.claude/statusline.sh`
2. Make it executable: `chmod +x ~/.claude/statusline.sh`
3. Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "/Users/YOUR_USERNAME/.claude/statusline.sh"
  }
}
```

## Troubleshooting

### Statusline not showing?

1. Make sure you restarted Claude Code after installation
2. Check that `jq` is installed: `which jq`
3. Verify the script is executable: `ls -la ~/.claude/statusline.sh`

### Wrong colors?

Your terminal needs to support 256 colors. Most modern terminals do.

### Git status not showing?

Make sure you're in a git repository with at least one commit.

## Contributing

Issues and PRs welcome at [github.com/Buckits/claude-statusline](https://github.com/Buckits/claude-statusline)

## License

MIT © [Buckits](https://github.com/Buckits)

---

<div align="center">

**Made for the Claude Code community** 🤖

*Star this repo if you find it useful!*

</div>
