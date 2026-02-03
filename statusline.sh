#!/bin/bash

# Claude Code Status Line Script
# Read JSON input from stdin

input=$(cat)

# Extract values from JSON
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
model=$(echo "$input" | jq -r '.model.display_name // empty')

# Extract token information from context_window
# The actual context usage includes cache tokens from prompt caching
total_input=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_output=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
cache_read=$(echo "$input" | jq -r '.context_window.current_usage.cache_read_input_tokens // 0')

# Total used = input + output + cached tokens being used
used_tokens=$((total_input + total_output + cache_read))
max_tokens=$(echo "$input" | jq -r '.context_window.context_window_size // 200000')

# Use the pre-calculated percentage if available (more accurate)
percent_precalc=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
if [ -n "$percent_precalc" ]; then
    percent=$percent_precalc
    # Recalculate used_tokens from percentage for display accuracy
    used_tokens=$((max_tokens * percent / 100))
else
    # Fallback: calculate percentage from tokens
    if [ "$max_tokens" -gt 0 ] 2>/dev/null; then
        percent=$((used_tokens * 100 / max_tokens))
    else
        percent=0
    fi
fi

# Clamp percent to 0-100
[ "$percent" -lt 0 ] && percent=0
[ "$percent" -gt 100 ] && percent=100

# Progress bar settings - 50 squares (4k tokens each for 200k context)
bar_width=50
filled=$((percent * bar_width / 100))
empty=$((bar_width - filled))

# Get color for a specific bar position (0 to bar_width-1)
# Each bar position gets its own color based on progression
get_bar_color_for_position() {
    local pos=$1
    local total=$2
    # Calculate percentage for this specific bar position
    local bar_pct=$((pos * 100 / total))

    if [ "$bar_pct" -le 33 ]; then
        # Green range: 0-33%
        # Bright green (46) → yellow-green (154) → green (34)
        if [ "$bar_pct" -le 16 ]; then
            echo "38;5;46"  # Bright green
        elif [ "$bar_pct" -le 25 ]; then
            echo "38;5;118" # Green-yellow
        else
            echo "38;5;154" # Yellow-green
        fi
    elif [ "$bar_pct" -le 66 ]; then
        # Orange range: 34-66%
        # Yellow (226) → orange (214) → dark orange (208)
        local adj_pct=$((bar_pct - 33))
        if [ "$adj_pct" -le 11 ]; then
            echo "38;5;226" # Yellow
        elif [ "$adj_pct" -le 22 ]; then
            echo "38;5;220" # Light orange
        else
            echo "38;5;214" # Orange
        fi
    else
        # Red range: 67-100%
        # Orange-red (208) → red (196) → dark red (160)
        local adj_pct=$((bar_pct - 66))
        if [ "$adj_pct" -le 11 ]; then
            echo "38;5;208" # Orange-red
        elif [ "$adj_pct" -le 22 ]; then
            echo "38;5;202" # Red-orange
        else
            echo "38;5;196" # Bright red
        fi
    fi
}

# Build progress bar with gradient colors
# Track the color of the rightmost filled bar for the percentage text
bar="["
rightmost_color="38;5;46"  # Default to bright green
for ((i=0; i<filled; i++)); do
    bar_color=$(get_bar_color_for_position $i $bar_width)
    rightmost_color=$bar_color  # Keep updating to track the last one
    bar+=$(printf "\033[${bar_color}m█\033[0m")
done
for ((i=0; i<empty; i++)); do
    bar+="░"
done
bar+="]"

# Get git information if in a git repo
git_branch=""
git_remote=""
if [ -n "$cwd" ] && git -C "$cwd" rev-parse --git-dir >/dev/null 2>&1; then
    git_branch=$(git -C "$cwd" branch --show-current 2>/dev/null)

    # Get the upstream tracking branch
    upstream=$(git -C "$cwd" rev-parse --abbrev-ref --symbolic-full-name @{upstream} 2>/dev/null)
    if [ -n "$upstream" ]; then
        # upstream will be in format like "origin/POC" or "origin/main"
        git_remote="$upstream"
    fi

    # Get ahead/behind counts
    git_ahead=""
    git_behind=""
    if [ -n "$upstream" ]; then
        # Get number of commits ahead/behind
        ahead_behind=$(git -C "$cwd" rev-list --left-right --count HEAD...$upstream 2>/dev/null)
        if [ -n "$ahead_behind" ]; then
            ahead=$(echo "$ahead_behind" | awk '{print $1}')
            behind=$(echo "$ahead_behind" | awk '{print $2}')
            [ "$ahead" -gt 0 ] && git_ahead="$ahead"
            [ "$behind" -gt 0 ] && git_behind="$behind"
        fi
    fi

    # Get git status (dirty/staged indicators)
    git_status_indicator=""
    if git -C "$cwd" rev-parse --git-dir >/dev/null 2>&1; then
        porcelain=$(git -C "$cwd" status --porcelain 2>/dev/null)

        has_unstaged=false
        has_staged=false

        if [ -n "$porcelain" ]; then
            # Check for staged changes (first column not space)
            if echo "$porcelain" | grep -q '^[MADRC]'; then
                has_staged=true
            fi

            # Check for unstaged changes (second column not space, or untracked files)
            if echo "$porcelain" | grep -q '^\?\?' || echo "$porcelain" | grep -q '^.[MD]'; then
                has_unstaged=true
            fi
        fi

        # Build status indicator
        if [ "$has_unstaged" = true ] && [ "$has_staged" = true ]; then
            git_status_indicator=$(printf "\033[1;33m●\033[1;32m✚\033[0m")  # Both
        elif [ "$has_unstaged" = true ]; then
            git_status_indicator=$(printf "\033[1;33m●\033[0m")  # Unstaged (yellow)
        elif [ "$has_staged" = true ]; then
            git_status_indicator=$(printf "\033[1;32m✚\033[0m")  # Staged (green)
        else
            git_status_indicator=$(printf "\033[1;32m✓\033[0m")  # Clean (green)
        fi
    fi
fi

# Get project name from directory
project_name=""
if [ -n "$cwd" ]; then
    project_name=$(basename "$cwd")
fi

# Format tokens for display (e.g., 45.2k/200k)
format_tokens() {
    local tokens=$1
    # Use pure bash arithmetic to avoid bc dependency
    if [ "$tokens" -ge 1000000 ]; then
        local millions=$((tokens / 1000000))
        local remainder=$((tokens % 1000000))
        local decimal=$((remainder / 100000))
        printf "%d.%dM" "$millions" "$decimal"
    elif [ "$tokens" -ge 1000 ]; then
        local thousands=$((tokens / 1000))
        local remainder=$((tokens % 1000))
        local decimal=$((remainder / 100))
        printf "%d.%dk" "$thousands" "$decimal"
    else
        echo "$tokens"
    fi
}

# Format tokens without decimals (e.g., 72k/200k)
format_tokens_int() {
    local tokens=$1
    if [ "$tokens" -ge 1000000 ]; then
        local millions=$((tokens / 1000000))
        printf "%dM" "$millions"
    elif [ "$tokens" -ge 1000 ]; then
        local thousands=$((tokens / 1000))
        printf "%dk" "$thousands"
    else
        echo "$tokens"
    fi
}

used_fmt=$(format_tokens $used_tokens)
max_fmt=$(format_tokens $max_tokens)
used_fmt_int=$(format_tokens_int $used_tokens)
max_fmt_int=$(format_tokens_int $max_tokens)

# Extract cost information
cost_usd=$(echo "$input" | jq -r '.cost.total_cost_usd // empty')
cost_display=""
if [ -n "$cost_usd" ] && [ "$cost_usd" != "null" ]; then
    # Format cost to 2 decimal places
    cost_display=$(printf "\$%.2f" "$cost_usd")
fi

# Extract tools/skills/agents counts
skills_count=$(echo "$input" | jq -r '.context.skills // [] | length')
agents_count=$(echo "$input" | jq -r '.context.agents // [] | length')
mcp_tools_count=$(echo "$input" | jq -r '.context.mcp_tools // [] | length')
total_tools=$((skills_count + agents_count + mcp_tools_count))
tools_display=""
if [ "$total_tools" -gt 0 ]; then
    tools_display=$(printf "🔧 %d" "$total_tools")
fi

# Extract background tasks (check for various possible field names)
bg_tasks=$(echo "$input" | jq -r '.background_tasks // .running_agents // .active_tasks // empty | length')
bg_display=""
if [ -n "$bg_tasks" ] && [ "$bg_tasks" != "null" ] && [ "$bg_tasks" -gt 0 ]; then
    bg_display=$(printf "⏳ %d" "$bg_tasks")
fi

# Extract "until compact" percentage
# Auto-compact triggers at a threshold (appears to be around 78% usage / 22% remaining)
# The "until compact" value = remaining_percentage - threshold_remaining
# If threshold is 22%, and you have 24% remaining, then until_compact = 24% - 22% = 2%

# First check if there's an explicit field (unlikely but worth checking)
until_compact=$(echo "$input" | jq -r '.context_window.until_compact // .context_window.until_auto_compact // empty')

if [ -z "$until_compact" ]; then
    # Calculate based on auto-compact threshold
    # Auto-compact threshold appears to be 22% remaining (78% used)
    AUTO_COMPACT_THRESHOLD=22

    remaining_pct=$(echo "$input" | jq -r '.context_window.remaining_percentage // 0')

    if [ "$remaining_pct" -gt "$AUTO_COMPACT_THRESHOLD" ]; then
        until_compact=$((remaining_pct - AUTO_COMPACT_THRESHOLD))
    else
        # Already past threshold or at it
        until_compact=0
    fi
fi

compact_indicator=""
compact_color="38;5;46"
if [ -n "$until_compact" ] && [ "$until_compact" != "null" ] && [ "$until_compact" != "0" ]; then
    if [ "$until_compact" -ge 25 ]; then
        compact_color="38;5;46"
    elif [ "$until_compact" -ge 20 ]; then
        compact_color="38;5;154"
    elif [ "$until_compact" -ge 15 ]; then
        compact_color="38;5;226"
    elif [ "$until_compact" -ge 10 ]; then
        compact_color="38;5;220"
    elif [ "$until_compact" -ge 7 ]; then
        compact_color="38;5;214"
    elif [ "$until_compact" -ge 4 ]; then
        compact_color="38;5;208"
    else
        compact_color="38;5;196"
    fi

    # Calculate tokens until compact threshold
    # Auto-compact threshold is 22% remaining (78% used)
    # Tokens until compact = until_compact * context_window_size / 100
    remaining_pct=$(echo "$input" | jq -r '.context_window.remaining_percentage // 0')
    tokens_until_compact=$((until_compact * max_tokens / 100))
    tokens_until_compact_fmt=$(format_tokens $tokens_until_compact)

    # Build indicator with tokens primary (gradient color) and percentage in parens (dim)
    compact_indicator_text=$(printf "⚡%s until compact" "$tokens_until_compact_fmt")
    compact_indicator_pct=$(printf "(%d%%)" "$until_compact")
fi

# ==========================================
# 2-LINE DASHBOARD LAYOUT
# ==========================================

# LINE 1: Model + Context
# Format: Opus 4.5 ($12.01) [███████░░░░░░░░⚡░░░░░] 74k/200k
line1=""

# Robot icon and model name in cyan
if [ -n "$model" ]; then
    line1+=$(printf "🤖 \033[1;36m%s\033[0m" "$model")
fi

# Add cost after model name (bright green)
if [ -n "$cost_display" ]; then
    line1+=$(printf " \033[1;32m(%s)\033[0m" "$cost_display")
fi

# Add subtle separator between cost and progress bar
line1+=$(printf " \033[2;37m│\033[0m")

# Build progress bar for line 1
# Calculate compact threshold position (78% of bar = 22% remaining)
AUTO_COMPACT_THRESHOLD=22
compact_threshold_pct=$((100 - AUTO_COMPACT_THRESHOLD))  # 78%
threshold_position=$((compact_threshold_pct * bar_width / 100))

# Build unified progress bar with per-bar gradient toward threshold
unified_bar="["
unified_rightmost_color="38;5;46"  # Default green

for ((i=0; i<bar_width; i++)); do
    if [ "$i" -eq "$threshold_position" ]; then
        # Insert red lightning bolt threshold marker
        unified_bar+=$(printf "\033[0;31m⚡\033[0m")
    fi

    if [ "$i" -lt "$filled" ]; then
        # Calculate color for this specific bar position
        # Gradient from green (position 0) to red (threshold position)
        if [ "$threshold_position" -gt 0 ]; then
            bar_position_pct=$((i * 100 / threshold_position))
        else
            bar_position_pct=0
        fi

        # Map position percentage to gradient colors
        if [ "$bar_position_pct" -le 20 ]; then
            bar_color="38;5;46"   # Bright green
        elif [ "$bar_position_pct" -le 40 ]; then
            bar_color="38;5;118"  # Green-yellow
        elif [ "$bar_position_pct" -le 60 ]; then
            bar_color="38;5;154"  # Yellow-green
        elif [ "$bar_position_pct" -le 70 ]; then
            bar_color="38;5;226"  # Yellow
        elif [ "$bar_position_pct" -le 80 ]; then
            bar_color="38;5;220"  # Light orange
        elif [ "$bar_position_pct" -le 90 ]; then
            bar_color="38;5;214"  # Orange
        elif [ "$bar_position_pct" -le 95 ]; then
            bar_color="38;5;208"  # Orange-red
        else
            bar_color="38;5;196"  # Red
        fi

        unified_rightmost_color=$bar_color
        unified_bar+=$(printf "\033[${bar_color}m█\033[0m")
    else
        unified_bar+="░"
    fi
done

unified_bar+="]"

# Add progress bar and tokens to line 1
line1+=$(printf " %s \033[${unified_rightmost_color}m%s\033[0m\033[1;36m/%s\033[0m" "$unified_bar" "$used_fmt_int" "$max_fmt_int")

# LINE 2: Project/Git Info
# Format: 📁 myproject main ✓ → origin/main ↑11
line2=""

# Folder icon and project name in cyan
if [ -n "$project_name" ]; then
    line2+=$(printf "📁 \033[1;36m%s\033[0m" "$project_name")
fi

# Git branch and tracking
if [ -n "$git_branch" ]; then
    [ -n "$line2" ] && line2+=" "

    # Branch in magenta
    line2+=$(printf "\033[1;35m%s\033[0m" "$git_branch")

    # Git status indicator (after branch name)
    if [ -n "$git_status_indicator" ]; then
        line2+=$(printf " %s" "$git_status_indicator")
    fi

    # Arrow and tracking
    line2+=$(printf " \033[2;37m→\033[0m")

    if [ -n "$git_remote" ]; then
        # Tracking branch in blue
        line2+=$(printf " \033[1;34m%s\033[0m" "$git_remote")

        # Ahead/behind indicators
        if [ -n "$git_ahead" ] || [ -n "$git_behind" ]; then
            line2+=" "
            [ -n "$git_ahead" ] && line2+=$(printf "\033[0;32m↑%s\033[0m" "$git_ahead")
            if [ -n "$git_behind" ]; then
                [ -n "$git_ahead" ] && line2+=" "
                line2+=$(printf "\033[0;31m↓%s\033[0m" "$git_behind")
            fi
        fi
    else
        line2+=$(printf " \033[2;37m(no upstream)\033[0m")
    fi
fi

# GSD Update check (appended to line 2 if update available)
gsd_update_suffix=""
gsd_cache_file="$HOME/.claude/cache/gsd-update-check.json"

# Check for GSD in project first, then global
gsd_version_file=""
if [ -n "$cwd" ] && [ -f "$cwd/.claude/get-shit-done/VERSION" ]; then
    gsd_version_file="$cwd/.claude/get-shit-done/VERSION"
elif [ -f "$HOME/.claude/get-shit-done/VERSION" ]; then
    gsd_version_file="$HOME/.claude/get-shit-done/VERSION"
fi

if [ -n "$gsd_version_file" ]; then
    # Read installed version directly from the VERSION file we found
    installed_ver=$(cat "$gsd_version_file" 2>/dev/null | tr -d '[:space:]')
    [ -z "$installed_ver" ] && installed_ver="0.0.0"

    # Get latest version from cache (populated by SessionStart hook)
    if [ -f "$gsd_cache_file" ]; then
        latest_ver=$(jq -r '.latest // "unknown"' "$gsd_cache_file" 2>/dev/null)

        # Compare versions - append to line2 if they differ
        if [ "$latest_ver" != "unknown" ] && [ "$installed_ver" != "$latest_ver" ]; then
            gsd_update_suffix=$(printf "    |  GSD %s>%s" "$installed_ver" "$latest_ver")
        fi
    fi
fi

# Append GSD update to line2 if available
line2+="$gsd_update_suffix"

# Output the dashboard (2 lines, no trailing newline)
printf "%s\033[K\n%s\033[K" "$line1" "$line2"
