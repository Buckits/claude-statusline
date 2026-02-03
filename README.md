# @buckits/claude-statusline

A beautiful 2-line dashboard statusline for Claude Code with gradient progress bar, compact threshold marker, git status indicators, cost tracking, and GSD (Get Shit Done) update notifications.

## Installation

```bash
npx @buckits/claude-statusline
```

## Features

- **2-Line Dashboard Layout** - Clean separation of AI info and project info
- **Gradient Progress Bar** - 50 segments (4k tokens each) that smoothly transition green → yellow → orange → red
- **⚡ Compact Threshold Marker** - Red lightning bolt shows exactly where auto-compact triggers (78%)
- **Session Cost Tracking** - See your running cost in real-time
- **Git Status Indicators**:
  - `✓` Green checkmark = clean (all committed)
  - `●` Yellow dot = unstaged changes
  - `✚` Green plus = staged changes ready to commit
  - `●✚` Both = partial commit state
- **Ahead/Behind Tracking** - `↑5 ↓2` shows commits ahead/behind remote
- **Visual Icons** - 🤖 for AI line, 📁 for project line
- **GSD Update Notifications** - Automatically detects [Get Shit Done](https://www.npmjs.com/package/get-shit-done-cc) installations and shows available updates

## Screenshot

```
🤖 Opus 4.5 ($14.61) │ [████████████████████░░░░░░░░░░░░░░░░░░░⚡░░░░░░░░░░░] 80k/200k
📁 trellis POC ✓ → origin/POC ↑15
```

With GSD update available:
```
🤖 Opus 4.5 ($14.61) │ [████████████████████░░░░░░░░░░░░░░░░░░░⚡░░░░░░░░░░░] 80k/200k
📁 trellis POC ✓ → origin/POC ↑15    |  GSD 1.5.0>1.6.4
```

## What Each Element Means

### Line 1 - AI Session Info
| Element | Description |
|---------|-------------|
| 🤖 | AI indicator |
| `Opus 4.5` | Current model (cyan) |
| `($14.61)` | Session cost (green) |
| `│` | Separator |
| `[███░░░⚡░░░]` | Context usage with compact threshold |
| `80k/200k` | Tokens used / total |

### Line 2 - Project Info
| Element | Description |
|---------|-------------|
| 📁 | Project indicator |
| `trellis` | Project name (cyan) |
| `POC` | Current branch (magenta) |
| `✓●✚` | Git status (clean/unstaged/staged) |
| `→` | Points to tracking branch |
| `origin/POC` | Remote tracking branch (blue) |
| `↑15` | Commits ahead (green) |
| `↓3` | Commits behind (red) |

## GSD Integration

If you have [Get Shit Done (GSD)](https://www.npmjs.com/package/get-shit-done-cc) installed, the statusline will automatically detect it and show update notifications when a newer version is available.

**How it works:**
1. Checks for GSD installation in project (`.claude/get-shit-done/VERSION`) or global (`~/.claude/get-shit-done/VERSION`)
2. Reads the latest version from GSD's update cache (`~/.claude/cache/gsd-update-check.json`)
3. If versions differ, shows the update notification on line 2

**Note:** The cache is populated by GSD's SessionStart hook. If you see no notification, you're either on the latest version or GSD hasn't checked for updates yet.

## Progress Bar Colors

The bar gradient is calculated relative to the ⚡ threshold (not total capacity):

| Distance to ⚡ | Color |
|---------------|-------|
| Far (safe) | Bright green |
| Approaching | Yellow |
| Close | Orange |
| At threshold | Red |

## Manual Installation

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

## Requirements

- Claude Code CLI
- `jq` (for JSON parsing)
- Bash
- Git (for git status features)

## License

MIT
