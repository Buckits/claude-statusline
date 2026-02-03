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
   ${green}██${reset}${yellow}██${reset}${red}██${reset}${dim}░░░░${reset}${red}⚡${reset}${dim}░░░  Gradient progress • Git status${reset}
   ${dim}───────────────────────────────────────────${reset}
`;

// Help text
if (hasHelp) {
  console.log(banner);
  console.log(`   ${yellow}Usage:${reset} npx @buckits/claude-statusline [options]

   ${yellow}Options:${reset}
     ${cyan}-g, --global${reset}     Install globally (${dim}~/.claude${reset})
     ${cyan}-l, --local${reset}      Install locally (${dim}./.claude${reset})
     ${cyan}-u, --uninstall${reset}  Remove statusline configuration
     ${cyan}-h, --help${reset}       Show this help message

   ${yellow}Examples:${reset}
     ${dim}# Interactive install (prompts for location and width)${reset}
     npx @buckits/claude-statusline

     ${dim}# Install globally for all projects${reset}
     npx @buckits/claude-statusline --global

     ${dim}# Install for current project only${reset}
     npx @buckits/claude-statusline --local

     ${dim}# Uninstall${reset}
     npx @buckits/claude-statusline --global --uninstall
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

  // Remove statusline.cjs
  const statuslinePath = path.join(targetDir, 'statusline.cjs');
  if (fs.existsSync(statuslinePath)) {
    fs.unlinkSync(statuslinePath);
    console.log(`   ${green}✓${reset} Removed statusline.cjs`);
    removed = true;
  }

  // Clean up settings.json
  const settingsPath = path.join(targetDir, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = readSettings(settingsPath);

    if (settings.statusLine && settings.statusLine.command &&
        settings.statusLine.command.includes('statusline.cjs')) {
      delete settings.statusLine;
      writeSettings(settingsPath, settings);
      console.log(`   ${green}✓${reset} Removed statusline from settings.json`);
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
function install(isGlobal, barWidth) {
  barWidth = barWidth || 50;
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

  // Copy statusline.cjs
  const statuslineSrc = path.join(__dirname, '..', 'statusline.cjs');
  const statuslineDest = path.join(targetDir, 'statusline.cjs');
  fs.copyFileSync(statuslineSrc, statuslineDest);
  fs.chmodSync(statuslineDest, '755');
  console.log(`   ${green}✓${reset} Installed statusline.cjs`);

  // Update settings.json
  const settingsPath = path.join(targetDir, 'settings.json');
  const settings = readSettings(settingsPath);

  // Set statusline config (always overwrite)
  settings.statusLine = {
    type: 'command',
    command: statuslineDest + ' --width ' + barWidth
  };

  writeSettings(settingsPath, settings);
  console.log(`   ${green}✓${reset} Configured settings.json`);

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
    install(true, 50);
    return;
  }

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

  rl.question(`   Choice ${dim}[1]${reset}: `, (locAnswer) => {
    const isGlobal = (locAnswer.trim() || '1') !== '2';
    console.log('');
    promptWidth(rl, (barWidth) => {
      answered = true;
      rl.close();
      console.log('');
      install(isGlobal, barWidth);
    });
  });
}

/**
 * Interactive prompt for bar width
 */
function promptWidth(rl, callback) {
  console.log(`   ${yellow}Progress bar width?${reset}

   ${cyan}1${reset}) ${bold}Compact${reset}  ${dim}[${green}${'██'.repeat(3)}${reset}${dim}${'░'.repeat(19)}${red}ϟ${reset}${dim}${'░'.repeat(3)}]${reset}  ${dim}25 bars${reset}
   ${cyan}2${reset}) ${bold}Medium${reset}   ${dim}[${green}${'██'.repeat(5)}${reset}${dim}${'░'.repeat(24)}${red}ϟ${reset}${dim}${'░'.repeat(5)}]${reset}  ${dim}38 bars${reset}
   ${cyan}3${reset}) ${bold}Full${reset}     ${dim}[${green}${'██'.repeat(7)}${reset}${dim}${'░'.repeat(28)}${red}ϟ${reset}${dim}${'░'.repeat(8)}]${reset}  ${dim}50 bars${reset}
   ${cyan}4${reset}) ${bold}Custom${reset}   ${dim}Enter your own number${reset}
`);

  rl.question(`   Choice ${dim}[3]${reset}: `, (answer) => {
    const choice = answer.trim() || '3';
    const widths = { '1': 25, '2': 38, '3': 50 };

    if (choice === '4') {
      rl.question(`   Number of bars ${dim}(10-100)${reset}: `, (numAnswer) => {
        const num = parseInt(numAnswer.trim(), 10);
        if (num >= 10 && num <= 100) {
          callback(num);
        } else {
          console.log(`   ${yellow}⚠${reset} Invalid number, using default (50)\n`);
          callback(50);
        }
      });
    } else {
      callback(widths[choice] || 50);
    }
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
