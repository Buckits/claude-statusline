#!/usr/bin/env node

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Parse --width arg (default 50)
const widthArgIdx = process.argv.indexOf('--width');
const BAR_WIDTH = widthArgIdx !== -1 && process.argv[widthArgIdx + 1]
  ? parseInt(process.argv[widthArgIdx + 1], 10) || 50
  : 50;

// Read JSON input from stdin
let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  try {
    main(JSON.parse(inputData));
  } catch (e) {
    process.exit(1);
  }
});

function main(input) {
  // Extract values from JSON
  const cwd = (input.workspace && input.workspace.current_dir) || input.cwd || '';
  const model = (input.model && input.model.display_name) || '';

  // Extract token information from context_window
  const cw = input.context_window || {};
  const cu = cw.current_usage || {};
  const totalInput = Number(cw.total_input_tokens) || 0;
  const totalOutput = Number(cw.total_output_tokens) || 0;
  const cacheRead = Number(cu.cache_read_input_tokens) || 0;

  // Total used = input + output + cached tokens being used
  let usedTokens = totalInput + totalOutput + cacheRead;
  const maxTokens = Number(cw.context_window_size) || 200000;

  // Use the pre-calculated percentage if available (more accurate)
  let percent;
  const percentPrecalc = cw.used_percentage;
  if (percentPrecalc != null && percentPrecalc !== '') {
    percent = Math.trunc(Number(percentPrecalc));
    // Recalculate used_tokens from percentage for display accuracy
    usedTokens = Math.trunc(maxTokens * percent / 100);
  } else {
    // Fallback: calculate percentage from tokens
    percent = maxTokens > 0 ? Math.trunc(usedTokens * 100 / maxTokens) : 0;
  }

  // Clamp percent to 0-100
  if (percent < 0) percent = 0;
  if (percent > 100) percent = 100;

  // Progress bar settings
  const barWidth = BAR_WIDTH;
  const filled = Math.trunc(percent * barWidth / 100);

  // ── Git information ──────────────────────────────────
  let gitBranch = '';
  let gitRemote = '';
  let gitAhead = '';
  let gitBehind = '';
  let gitStatusIndicator = '';

  if (cwd) {
    try {
      execFileSync('git', ['rev-parse', '--git-dir'], { cwd, stdio: 'pipe' });

      // Branch name
      try {
        gitBranch = execFileSync('git', ['branch', '--show-current'],
          { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
      } catch (e) {}

      // Upstream tracking branch
      let upstream = '';
      try {
        upstream = execFileSync('git',
          ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'],
          { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
        gitRemote = upstream;
      } catch (e) {}

      // Ahead/behind counts
      if (upstream) {
        try {
          const ab = execFileSync('git',
            ['rev-list', '--left-right', '--count', 'HEAD...' + upstream],
            { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
          const parts = ab.split(/\s+/);
          const ahead = parseInt(parts[0], 10);
          const behind = parseInt(parts[1], 10);
          if (ahead > 0) gitAhead = String(ahead);
          if (behind > 0) gitBehind = String(behind);
        } catch (e) {}
      }

      // Git status (dirty/staged indicators)
      try {
        const porcelain = execFileSync('git', ['status', '--porcelain'],
          { cwd, encoding: 'utf8', stdio: 'pipe' });

        let hasUnstaged = false;
        let hasStaged = false;

        if (porcelain) {
          const lines = porcelain.split('\n');
          for (const line of lines) {
            if (!line) continue;
            // Check for staged changes (first column not space)
            if (/^[MADRC]/.test(line)) hasStaged = true;
            // Check for unstaged changes (second column not space, or untracked files)
            if (/^\?\?/.test(line) || /^.[MD]/.test(line)) hasUnstaged = true;
          }
        }

        // Build status indicator
        if (hasUnstaged && hasStaged) {
          gitStatusIndicator = '\x1b[1;33m●\x1b[1;32m✚\x1b[0m';  // Both
        } else if (hasUnstaged) {
          gitStatusIndicator = '\x1b[1;33m●\x1b[0m';              // Unstaged (yellow)
        } else if (hasStaged) {
          gitStatusIndicator = '\x1b[1;32m✚\x1b[0m';              // Staged (green)
        } else {
          gitStatusIndicator = '\x1b[1;32m✓\x1b[0m';              // Clean (green)
        }
      } catch (e) {}
    } catch (e) {
      // Not a git repo — skip git info
    }
  }

  // Project name from directory
  const projectName = cwd ? path.basename(cwd) : '';

  // ── Token formatting ─────────────────────────────────

  // Format tokens for display (e.g., 45.2k/200k)
  function formatTokens(tokens) {
    if (tokens >= 1000000) {
      const millions = Math.trunc(tokens / 1000000);
      const decimal = Math.trunc((tokens % 1000000) / 100000);
      return millions + '.' + decimal + 'M';
    } else if (tokens >= 1000) {
      const thousands = Math.trunc(tokens / 1000);
      const decimal = Math.trunc((tokens % 1000) / 100);
      return thousands + '.' + decimal + 'k';
    }
    return String(tokens);
  }

  // Format tokens without decimals (e.g., 72k/200k)
  function formatTokensInt(tokens) {
    if (tokens >= 1000000) {
      return Math.trunc(tokens / 1000000) + 'M';
    } else if (tokens >= 1000) {
      return Math.trunc(tokens / 1000) + 'k';
    }
    return String(tokens);
  }

  const usedFmtInt = formatTokensInt(usedTokens);
  const maxFmtInt = formatTokensInt(maxTokens);

  // ── Cost ──────────────────────────────────────────────
  let costDisplay = '';
  const costUsd = input.cost && input.cost.total_cost_usd;
  if (costUsd != null && costUsd !== '' && costUsd !== null) {
    costDisplay = '$' + Number(costUsd).toFixed(2);
  }

  // ── Tools / Skills / Agents counts ────────────────────
  const ctx = input.context || {};
  const skillsCount = Array.isArray(ctx.skills) ? ctx.skills.length : 0;
  const agentsCount = Array.isArray(ctx.agents) ? ctx.agents.length : 0;
  const mcpToolsCount = Array.isArray(ctx.mcp_tools) ? ctx.mcp_tools.length : 0;
  const totalTools = skillsCount + agentsCount + mcpToolsCount;
  let toolsDisplay = '';
  if (totalTools > 0) {
    toolsDisplay = '\uD83D\uDD27 ' + totalTools; // 🔧
  }

  // ── Background tasks ──────────────────────────────────
  const bgTasksArr = input.background_tasks || input.running_agents || input.active_tasks;
  let bgTasksCount = 0;
  if (bgTasksArr != null) {
    bgTasksCount = Array.isArray(bgTasksArr) ? bgTasksArr.length : 0;
  }
  let bgDisplay = '';
  if (bgTasksCount > 0) {
    bgDisplay = '\u231B ' + bgTasksCount; // ⏳
  }

  // ── Auto-compact threshold ────────────────────────────
  const AUTO_COMPACT_THRESHOLD = 22;
  let untilCompact = cw.until_compact != null ? Number(cw.until_compact)
    : cw.until_auto_compact != null ? Number(cw.until_auto_compact)
    : null;

  if (untilCompact == null) {
    const remainingPct = Number(cw.remaining_percentage) || 0;
    if (remainingPct > AUTO_COMPACT_THRESHOLD) {
      untilCompact = remainingPct - AUTO_COMPACT_THRESHOLD;
    } else {
      untilCompact = 0;
    }
  }

  let compactColor = '38;5;46';
  let compactIndicatorText = '';
  let compactIndicatorPct = '';

  if (untilCompact && untilCompact !== 0) {
    if (untilCompact >= 25) compactColor = '38;5;46';
    else if (untilCompact >= 20) compactColor = '38;5;154';
    else if (untilCompact >= 15) compactColor = '38;5;226';
    else if (untilCompact >= 10) compactColor = '38;5;220';
    else if (untilCompact >= 7) compactColor = '38;5;214';
    else if (untilCompact >= 4) compactColor = '38;5;208';
    else compactColor = '38;5;196';

    // Calculate tokens until compact threshold
    const tokensUntilCompact = Math.trunc(untilCompact * maxTokens / 100);
    const tokensUntilCompactFmt = formatTokens(tokensUntilCompact);

    // Build indicator with tokens primary (gradient color) and percentage in parens (dim)
    compactIndicatorText = '\u26A1' + tokensUntilCompactFmt + ' until compact'; // ⚡
    compactIndicatorPct = '(' + untilCompact + '%)';
  }

  // ══════════════════════════════════════════════════════
  // 2-LINE DASHBOARD LAYOUT
  // ══════════════════════════════════════════════════════

  // LINE 1: Model + Context
  // Format: Opus 4.5 ($12.01) [███████░░░░░░░░⚡░░░░░] 74k/200k

  const compactThresholdPct = 100 - AUTO_COMPACT_THRESHOLD; // 78%
  const thresholdPosition = Math.trunc(compactThresholdPct * barWidth / 100);

  // Build unified progress bar with per-bar gradient toward threshold
  let unifiedBar = '[';
  let unifiedRightmostColor = '38;2;0;255;0'; // Default green

  // Smooth RGB gradient: green(0,255,0) → yellow(255,255,0) → red(255,0,0)
  // t = 0.0 → green, t = 0.5 → yellow, t = 1.0 → red
  function gradientRGB(i) {
    const t = thresholdPosition > 0 ? i / thresholdPosition : 0;
    let r, g;
    if (t <= 0.5) {
      // Green → Yellow: R ramps up, G stays max
      r = Math.round(t * 2 * 255);
      g = 255;
    } else {
      // Yellow → Red: R stays max, G ramps down
      r = 255;
      g = Math.round((1 - t) * 2 * 255);
    }
    return { r, g, b: 0 };
  }

  for (let i = 0; i < barWidth; i++) {
    if (i === thresholdPosition) {
      // Threshold marker: bolt replaces this bar segment
      if (i < filled) {
        // Filled: gradient background with contrasting bold white bolt
        const { r, g, b } = gradientRGB(i);
        unifiedRightmostColor = '38;2;' + r + ';' + g + ';' + b;
        unifiedBar += '\x1b[48;2;' + r + ';' + g + ';' + b + ';1;37m\u03DF\x1b[0m';
      } else {
        // Not filled: bright red bolt on theme-adaptive dark background
        unifiedBar += '\x1b[100;38;2;255;0;0m\u03DF\x1b[0m';
      }
    } else if (i < filled) {
      if (i > thresholdPosition) {
        // Past threshold: always red
        unifiedRightmostColor = '38;2;255;0;0';
        unifiedBar += '\x1b[38;2;255;0;0m\u2588\x1b[0m';
      } else {
        const { r, g, b } = gradientRGB(i);
        const color = '38;2;' + r + ';' + g + ';' + b;
        unifiedRightmostColor = color;
        unifiedBar += '\x1b[' + color + 'm\u2588\x1b[0m';
      }
    } else {
      unifiedBar += '\u2591'; // ░
    }
  }

  unifiedBar += ']';

  // Assemble Line 1
  let line1 = '';

  // Robot icon and model name in cyan
  if (model) {
    line1 += '\uD83E\uDD16 \x1b[1;36m' + model + '\x1b[0m'; // 🤖
  }

  // Add cost after model name (bright green)
  if (costDisplay) {
    line1 += ' \x1b[1;32m(' + costDisplay + ')\x1b[0m';
  }

  // Add subtle separator between cost and progress bar
  line1 += ' \x1b[2;37m\u2502\x1b[0m'; // │

  // Add progress bar and tokens to line 1
  line1 += ' ' + unifiedBar
    + ' \x1b[' + unifiedRightmostColor + 'm' + usedFmtInt + '\x1b[0m'
    + '\x1b[1;36m/' + maxFmtInt + '\x1b[0m';

  // LINE 2: Project/Git Info
  // Format: 📁 myproject main ✓ → origin/main ↑11
  let line2 = '';

  // Folder icon and project name in cyan
  if (projectName) {
    line2 += '\uD83D\uDCC1 \x1b[1;36m' + projectName + '\x1b[0m'; // 📁
  }

  // Git branch and tracking
  if (gitBranch) {
    if (line2) line2 += ' ';

    // Branch in magenta
    line2 += '\x1b[1;35m' + gitBranch + '\x1b[0m';

    // Git status indicator (after branch name)
    if (gitStatusIndicator) {
      line2 += ' ' + gitStatusIndicator;
    }

    // Arrow and tracking
    line2 += ' \x1b[2;37m\u2192\x1b[0m'; // →

    if (gitRemote) {
      // Tracking branch in blue
      line2 += ' \x1b[1;34m' + gitRemote + '\x1b[0m';

      // Ahead/behind indicators
      if (gitAhead || gitBehind) {
        line2 += ' ';
        if (gitAhead) line2 += '\x1b[0;32m\u2191' + gitAhead + '\x1b[0m'; // ↑
        if (gitBehind) {
          if (gitAhead) line2 += ' ';
          line2 += '\x1b[0;31m\u2193' + gitBehind + '\x1b[0m'; // ↓
        }
      }
    } else {
      line2 += ' \x1b[2;37m(no upstream)\x1b[0m';
    }
  }

  // ── GSD Update check ─────────────────────────────────
  let gsdUpdateSuffix = '';
  const gsdCacheFile = path.join(os.homedir(), '.claude', 'cache', 'gsd-update-check.json');

  // Check for GSD in project first, then global
  let gsdVersionFile = '';
  if (cwd) {
    const localGsd = path.join(cwd, '.claude', 'get-shit-done', 'VERSION');
    if (fs.existsSync(localGsd)) {
      gsdVersionFile = localGsd;
    }
  }
  if (!gsdVersionFile) {
    const globalGsd = path.join(os.homedir(), '.claude', 'get-shit-done', 'VERSION');
    if (fs.existsSync(globalGsd)) {
      gsdVersionFile = globalGsd;
    }
  }

  if (gsdVersionFile) {
    let installedVer = '';
    try {
      installedVer = fs.readFileSync(gsdVersionFile, 'utf8').trim();
    } catch (e) {}
    if (!installedVer) installedVer = '0.0.0';

    // Get latest version from cache (populated by SessionStart hook)
    if (fs.existsSync(gsdCacheFile)) {
      try {
        const cache = JSON.parse(fs.readFileSync(gsdCacheFile, 'utf8'));
        const latestVer = cache.latest || 'unknown';

        // Compare versions - append to line2 if they differ
        if (latestVer !== 'unknown' && installedVer !== latestVer) {
          gsdUpdateSuffix = '    |  GSD ' + installedVer + '>' + latestVer;
        }
      } catch (e) {}
    }
  }

  // Append GSD update to line2 if available
  line2 += gsdUpdateSuffix;

  // Output the dashboard (2 lines, no trailing newline)
  process.stdout.write(line1 + '\x1b[K\n' + line2 + '\x1b[K');
}
