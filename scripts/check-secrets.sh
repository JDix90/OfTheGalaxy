#!/usr/bin/env bash
#
# check-secrets.sh — scan files for committed secrets.
#
# Usage:
#   scripts/check-secrets.sh                # scan files staged for commit (git diff --cached)
#   scripts/check-secrets.sh --all          # scan the whole working tree (tracked + untracked, minus ignores)
#   scripts/check-secrets.sh <file> [...]   # scan specific files
#
# Exit code 1 if any secret-looking content is found. Wired in as a pre-commit hook
# via `git config core.hooksPath .githooks` (see SECURITY_ROTATION.md).

set -uo pipefail

RED=$'\033[0;31m'; YEL=$'\033[1;33m'; NC=$'\033[0m'
findings=0

# Patterns: description<TAB>regex (extended POSIX). Keep these conservative to limit false positives.
patterns=$(cat <<'EOF'
OpenAI API key	(^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}
AWS access key id	AKIA[0-9A-Z]{16}
Private key block	-----BEGIN [A-Z ]*PRIVATE KEY-----
Google API key	AIza[0-9A-Za-z_-]{35}
Slack token	xox[baprs]-[0-9A-Za-z-]{10,}
Generic assigned secret	(secret|token|passwd|password|api[_-]?key)[ ]*[:=][ ]*[A-Za-z0-9+/_-]{16,}
Known leaked DB password	Cassie129
Known leaked OpenAI key prefix	sk-proj-h07MkGz
EOF
)

# Determine target file list.
collect_targets() {
  if [ "$#" -gt 0 ] && [ "$1" = "--all" ]; then
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      git ls-files --cached --others --exclude-standard
    else
      find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*'
    fi
  elif [ "$#" -gt 0 ]; then
    printf '%s\n' "$@"
  else
    git diff --cached --name-only --diff-filter=ACM 2>/dev/null
  fi
}

while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ -f "$f" ] || continue

  # Never allow a real .env (or variants) to be committed. .env.example is the only allowed env file.
  base=$(basename "$f")
  case "$base" in
    .env|.env.*)
      if [ "$base" != ".env.example" ]; then
        echo "${RED}BLOCKED${NC} $f — environment files must not be committed (only .env.example is allowed)."
        findings=$((findings+1))
        continue
      fi
      ;;
  esac

  # Skip obvious binary / large artifacts, and the scanner's own file (it
  # legitimately contains the known-leak literals as detection patterns).
  case "$base" in
    *.zip|*.png|*.jpg|*.jpeg|*.gif|*.pdf|*.lock|package-lock.json) continue ;;
    check-secrets.sh) continue ;;
  esac

  while IFS=$'\t' read -r desc rx; do
    [ -z "$rx" ] && continue
    if matches=$(grep -nEI "$rx" "$f" 2>/dev/null); then
      # .env.example may legitimately contain placeholder assignments; only flag if it looks real.
      if [ "$base" = ".env.example" ]; then
        echo "$matches" | grep -qiE 'change_me|your_|example|placeholder|=$' && continue
      fi
      echo "${RED}SECRET?${NC} ${YEL}$desc${NC} in $f"
      echo "$matches" | sed 's/^/    /'
      findings=$((findings+1))
    fi
  done <<< "$patterns"
done < <(collect_targets "$@")

if [ "$findings" -gt 0 ]; then
  echo
  echo "${RED}✖ $findings potential secret(s) found.${NC} Commit aborted."
  echo "  If a match is a false positive, remove/placeholder it, or bypass once with: git commit --no-verify"
  exit 1
fi

echo "✓ No secrets detected."
exit 0
