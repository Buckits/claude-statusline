#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');
const STATUSLINE_DEST = path.join(CLAUDE_DIR, 'statusline.sh');
const STATUSLINE_SRC = path.join(__dirname, '..', 'statusline.sh');

console.log('\n🎨 Installing @buckits/claude-statusline...\n');

// Ensure ~/.claude directory exists
if (!fs.existsSync(CLAUDE_DIR)) {
  console.log('📁 Creating ~/.claude directory...');
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
}

// Copy statusline.sh
console.log('📄 Copying statusline.sh...');
fs.copyFileSync(STATUSLINE_SRC, STATUSLINE_DEST);
fs.chmodSync(STATUSLINE_DEST, '755');

// Update settings.json
console.log('⚙️  Updating settings.json...');
let settings = {};

if (fs.existsSync(SETTINGS_FILE)) {
  try {
    const content = fs.readFileSync(SETTINGS_FILE, 'utf8');
    settings = JSON.parse(content);
  } catch (e) {
    console.warn('⚠️  Could not parse existing settings.json, creating new one');
  }
}

// Remove old format if present
if (settings.status_line) {
  delete settings.status_line;
}

// Set the statusLine configuration (correct camelCase format)
settings.statusLine = {
  type: "command",
  command: STATUSLINE_DEST
};

fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));

console.log('\n✅ Installation complete!\n');
console.log('Your Claude Code statusline now features:');
console.log('  • Gradient progress bar (green → yellow → orange → red)');
console.log('  • ⚡ Compact threshold marker at 78%');
console.log('  • Git branch, status, and ahead/behind tracking');
console.log('  • Session cost display');
console.log('  • GSD update notifications (if installed)');
console.log('\nRestart Claude Code to see the new statusline.\n');
