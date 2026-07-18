#!/usr/bin/env bash
# Bootstrap this dotfiles repo (bare-repo pattern) on a fresh machine.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/bfay1/dotfiles/master/.dotfiles-bootstrap.sh | bash
# or, if you've already cloned some other way:
#   bash .dotfiles-bootstrap.sh
set -euo pipefail

REPO_URL="git@github.com:bfay1/dotfiles.git"
GIT_DIR="$HOME/.dotfiles-bare"
dotgit() { git --git-dir="$GIT_DIR" --work-tree="$HOME" "$@"; }

if [ -d "$GIT_DIR" ]; then
  echo "Already bootstrapped: $GIT_DIR exists." >&2
  exit 1
fi

git clone --bare "$REPO_URL" "$GIT_DIR"
dotgit config status.showUntrackedFiles no

# A fresh machine typically already has default versions of some tracked
# files (.zshrc, .gitconfig, ...). Checkout refuses to clobber those, so
# back them up instead and retry.
BACKUP_DIR="$HOME/.dotfiles-bootstrap-backup-$(date +%Y%m%d%H%M%S)"
checkout_output=$(dotgit checkout 2>&1) && checkout_ok=1 || checkout_ok=0
if [ "$checkout_ok" -eq 0 ]; then
  conflicts=$(echo "$checkout_output" | grep -E '^\s+\S' | sed 's/^[[:space:]]*//')
  if [ -z "$conflicts" ]; then
    echo "$checkout_output" >&2
    exit 1
  fi
  echo "Backing up pre-existing files that would be overwritten to $BACKUP_DIR"
  while IFS= read -r f; do
    [ -e "$HOME/$f" ] || continue
    mkdir -p "$BACKUP_DIR/$(dirname "$f")"
    mv "$HOME/$f" "$BACKUP_DIR/$f"
  done <<< "$conflicts"
  dotgit checkout
fi

dotgit submodule update --init --recursive

echo "Done. Open a new shell (or 'source ~/.zshrc') to get the 'dotgit' alias."
echo "If any pre-existing files got backed up, they're in: $BACKUP_DIR"
