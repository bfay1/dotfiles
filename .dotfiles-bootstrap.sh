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

# Homebrew + the packages/casks/npm globals this machine had installed.
if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew not found; installing it..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi
if [ -f "$HOME/Brewfile" ]; then
  brew bundle install --file="$HOME/Brewfile"
fi

# Work git identity: .gitconfig conditionally includes ~/.gitconfig-work for
# anything under ~/work/, but that file itself isn't tracked (it'd expose a
# work email in a public repo), so it needs to be created on each machine.
if [ ! -f "$HOME/.gitconfig-work" ]; then
  read -r -p "Work git email for repos under ~/work/ (blank to skip): " work_email
  if [ -n "$work_email" ]; then
    mkdir -p "$HOME/work"
    printf '[user]\n\temail = %s\n' "$work_email" > "$HOME/.gitconfig-work"
  fi
fi

echo "Done. Open a new shell (or 'source ~/.zshrc') to get the 'dotgit' alias."
echo "If any pre-existing files got backed up, they're in: $BACKUP_DIR"
