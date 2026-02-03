#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Colors
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const magenta = '\x1b[35m';
const dim = '\x1b[2m';
const bold = '\x1b[1m';
const reset = '\x1b[0m';

// Get version from package.json
const pkg = require('../package.json');

// Parse args
const args = process.argv.slice(2);
const hasGlobal = args.includes('--global') || args.includes('-g');
const hasLocal = args.includes('--local') || args.includes('-l');
const hasHelp = args.includes('--help') || args.includes('-h');
const hasUninstall = args.includes('--uninstall') || args.includes('-u');
const hasForce = args.includes('--force') || args.includes('-f');

// Directory constants
const CLAUDE_DIR_NAME = '.claude';

function getGlobalDir() {
  if (process.env.CLAUDE_CONFIG_DIR) {
    return expandTilde(process.env.CLAUDE_CONFIG_DIR);
  }
  return path.join(os.homedir(), CLAUDE_DIR_NAME);
}

function getLocalDir() {
  return path.join(process.cwd(), CLAUDE_DIR_NAME);
}

function expandTilde(filePath) {
  if (filePath && filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

// ASCII Art Banner
const banner = `
${cyan}   ╔═╗╦  ╔═╗╦ ╦╔╦╗╔═╗
   ║  ║  ╠═╣║ ║ ║║║╣
   ╚═╝╩═╝╩ ╩╚═╝═╩╝╚═╝${reset}
   ${magenta}╔═╗╔╦╗╔═╗╔╦╗╦ ╦╔═╗╦  ╦╔╗╔╔═╗
   ╚═╗ ║ ╠═╣ ║ ║ ║╚═╗║  ║║║║║╣
   ╚═╝ ╩ ╩ ╩ ╩ ╚═╝╚═╝╩═╝╩╝╚╝╚═╝${reset}

   ${bold}The statusline Claude Code deserves${reset} ${dim}v${pkg.version}${reset}

   ${dim}───────────────────────────────────────────${reset}
   ${green}█${reset}${green}█${reset}${yellow}█${reset}${yellow}█${reset}${red}█${reset}${red}█${reset}░░░░⚡░░░  ${dim}Gradient progress • Git status${reset}
   ${dim}───────────────────────────────────────────${reset}
`;

const features = `
   ${cyan}✦${reset} ${bold}Gradient Progress Bar${reset}
     50 segments that flow ${green}green${reset} → ${yellow}yellow${reset} → ${red}red${reset}
     as you approach the context limit

   ${cyan}✦${reset} ${bold}⚡ Auto-Compact Threshold${reset}
     Red lightning bolt shows exactly where
     Claude will auto-summarize (78%)

   ${cyan}✦${reset} ${bold}Git Integration${reset}
     Branch • ${green}✓${reset}/${yellow}●${reset}/${green}✚${reset} status • ${green}↑${reset}ahead ${red}↓${reset}behind

   ${cyan}✦${reset} ${bold}Session Cost Tracking${reset}
     See your running \$ cost in real-time

   ${cyan}✦${reset} ${bold}2-Line Dashboard${reset}
     Line 1: 🤖 Model • Cost • Context
     Line 2: 📁 Project • Branch • Status
`;

const example = `
   ${dim}┌─────────────────────────────────────────────────────────────────┐${reset}
   ${dim}│${reset} 🤖 ${cyan}Opus 4.5${reset} ${green}(\$12.41)${reset} │ [${green}████████${yellow}████${red}██${reset}░░░░░░░⚡░░░░░] ${yellow}62k${reset}/${cyan}200k${reset} ${dim}│${reset}
   ${dim}│${reset} 📁 ${cyan}my-project${reset} ${magenta}main${reset} ${green}✓${reset} → ${cyan}origin/main${reset} ${green}↑2${reset}               ${dim}│${reset}
   ${dim}└─────────────────────────────────────────────────────────────────┘${reset}
`;

// Help text
if (hasHelp) {
  console.log(banner);
  console.log(`   ${yellow}Usage:${reset} npx @buckits/claude-statusline [options]

   ${yellow}Options:${reset}
     ${cyan}-g, --global${reset}     Install globally (${dim}~/.claude${reset})
     ${cyan}-l, --local${reset}      Install locally (${dim}./.claude${reset})
     ${cyan}-u, --uninstall${reset}  Remove statusline configuration
     ${cyan}-f, --force${reset}      Replace existing statusline config
     ${cyan}-h, --help${reset}       Show this help message

   ${yellow}Examples:${reset}
     ${dim}# Interactive install (prompts for location)${reset}
     npx @buckits/claude-statusline

     ${dim}# Install globally for all projects${reset}
     npx @buckits/claude-statusline --global

     ${dim}# Install for current project only${reset}
     npx @buckits/claude-statusline --local

     ${dim}# Replace existing statusline${reset}
     npx @buckits/claude-statusline --global --force
`);
  process.exit(0);
}

console.log(banner);

/**
 * Read and parse settings.json
 */
function readSettings(settingsPath) {
  if (fs.existsSync(settingsPath)) {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

/**
 * Write settings.json with proper formatting
 */
function writeSettings(settingsPath, settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

/**
 * Uninstall statusline
 */
function uninstall(isGlobal) {
  const targetDir = isGlobal ? getGlobalDir() : getLocalDir();
  const locationLabel = isGlobal
    ? targetDir.replace(os.homedir(), '~')
    : targetDir.replace(process.cwd(), '.');

  console.log(`   Uninstalling from ${cyan}${locationLabel}${reset}\n`);

  if (!fs.existsSync(targetDir)) {
    console.log(`   ${yellow}⚠${reset} Directory does not exist: ${locationLabel}`);
    console.log(`   Nothing to uninstall.\n`);
    return;
  }

  let removed = false;

  // Remove statusline.sh
  const statuslinePath = path.join(targetDir, 'statusline.sh');
  if (fs.existsSync(statuslinePath)) {
    fs.unlinkSync(statuslinePath);
    console.log(`   ${green}✓${reset} Removed statusline.sh`);
    removed = true;
  }

  // Clean up settings.json
  const settingsPath = path.join(targetDir, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = readSettings(settingsPath);

    if (settings.statusLine && settings.statusLine.command &&
        settings.statusLine.command.includes('statusline.sh')) {
      delete settings.statusLine;
      writeSettings(settingsPath, settings);
      console.log(`   ${green}✓${reset} Removed statusline from settings.json`);
      removed = true;
    }

    // Also clean up old format
    if (settings.status_line) {
      delete settings.status_line;
      writeSettings(settingsPath, settings);
      removed = true;
    }
  }

  if (!removed) {
    console.log(`   ${yellow}⚠${reset} No statusline configuration found.`);
  }

  console.log(`
   ${green}Done!${reset} Statusline has been removed.
   Restart Claude Code to see the change.
`);
}

/**
 * Install statusline
 */
function install(isGlobal) {
  const targetDir = isGlobal ? getGlobalDir() : getLocalDir();
  const locationLabel = isGlobal
    ? targetDir.replace(os.homedir(), '~')
    : targetDir.replace(process.cwd(), '.');

  console.log(`   Installing to ${cyan}${locationLabel}${reset}\n`);

  // Ensure directory exists
  if (!fs.existsSync(targetDir)) {
    console.log(`   ${dim}Creating ${locationLabel}...${reset}`);
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy statusline.sh
  const statuslineSrc = path.join(__dirname, '..', 'statusline.sh');
  const statuslineDest = path.join(targetDir, 'statusline.sh');
  fs.copyFileSync(statuslineSrc, statuslineDest);
  fs.chmodSync(statuslineDest, '755');
  console.log(`   ${green}✓${reset} Installed statusline.sh`);

  // Update settings.json
  const settingsPath = path.join(targetDir, 'settings.json');
  const settings = readSettings(settingsPath);

  // Check for existing statusline
  const hasExisting = settings.statusLine != null || settings.status_line != null;

  if (hasExisting && !hasForce) {
    const existingCmd = settings.statusLine?.command || settings.status_line?.script || '(custom)';
    console.log(`
   ${yellow}⚠${reset} Existing statusline detected
   ${dim}Current: ${existingCmd}${reset}

   Use ${cyan}--force${reset} to replace it, or keep your current config.
   ${dim}The statusline.sh file has been installed - you can switch anytime.${reset}
`);
  } else {
    // Remove old format if present
    if (settings.status_line) {
      delete settings.status_line;
    }

    // Set new format
    settings.statusLine = {
      type: 'command',
      command: statuslineDest
    };

    writeSettings(settingsPath, settings);
    console.log(`   ${green}✓${reset} Configured settings.json`);
  }

  // Success message
  console.log(`
   ${green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}
   ${green}✓${reset} ${bold}Installation complete!${reset}
   ${green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}

   ${cyan}Restart Claude Code${reset} to see your new statusline.

   ${dim}Tip: Works great with GSD (Get Shit Done)!${reset}
   ${dim}     npx get-shit-done-cc${reset}

   ${dim}Issues? ${reset}${cyan}github.com/Buckits/claude-statusline${reset}
`);
}

/**
 * Interactive prompt for install location
 */
function promptLocation() {
  if (!process.stdin.isTTY) {
    console.log(`   ${dim}Non-interactive mode, defaulting to global install${reset}\n`);
    install(true);
    return;
  }

  console.log(features);
  console.log(example);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let answered = false;

  rl.on('close', () => {
    if (!answered) {
      console.log(`\n   ${yellow}Installation cancelled${reset}\n`);
      process.exit(0);
    }
  });

  const globalPath = getGlobalDir().replace(os.homedir(), '~');

  console.log(`
   ${yellow}Where would you like to install?${reset}

   ${cyan}1${reset}) ${bold}Global${reset} ${dim}(${globalPath})${reset}
      Available in all your projects

   ${cyan}2${reset}) ${bold}Local${reset}  ${dim}(./.claude)${reset}
      This project only
`);

  rl.question(`   Choice ${dim}[1]${reset}: `, (answer) => {
    answered = true;
    rl.close();
    console.log('');
    const choice = answer.trim() || '1';
    install(choice !== '2');
  });
}

// Main logic
if (hasGlobal && hasLocal) {
  console.log(`   ${red}✗${reset} Cannot specify both --global and --local\n`);
  process.exit(1);
}

if (hasUninstall) {
  if (!hasGlobal && !hasLocal) {
    console.log(`   ${red}✗${reset} --uninstall requires --global or --local\n`);
    process.exit(1);
  }
  uninstall(hasGlobal);
} else if (hasGlobal || hasLocal) {
  install(hasGlobal);
} else {
  promptLocation();
}
