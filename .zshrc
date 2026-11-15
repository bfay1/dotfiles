export PATH="$HOME/.local/bin:$PATH"

# colored GCC warnings and errors
export GCC_COLORS='error=01;31:warning=01;35:note=01;36:caret=01;32:locus=01:quote=01'

# All standalone shell functions live here.
[ -f "$HOME/.zsh_functions" ] && source "$HOME/.zsh_functions"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

export HISTFILE="$HOME/.zsh_history"
export HISTSIZE=1000000000
export SAVEHIST=1000000000
setopt EXTENDED_HISTORY

export PATH="$HOME/homebrew/opt/node@22/bin:$PATH"

export DOCKER_HOST="unix://$HOME/.colima/default/docker.sock"

# ssh to the home Mac mini over Tailscale. If the VPN is on, drop it for the
# session and bring it back when ssh exits, even on Ctrl-C.
mini() {
  local was_on i
  (( $+functions[vpn] )) && [[ $(vpn) == "VPN on" ]] && was_on=1 && vpn off >/dev/null
  {
    echo "Waiting for Tailscale to reach the mini..."
    for i in {1..30}; do
      nc -z -G 2 100.68.168.35 22 2>/dev/null && break
      sleep 1
    done
    if (( i == 30 )); then
      echo "Mini not reachable. Is Tailscale connected and logged in?" >&2
      return 1
    fi
    ssh mini "$@"
  } always {
    [[ -n $was_on ]] && echo "Reconnecting the VPN..." && vpn on >/dev/null
  }
}

# Drop-in config for work and this machine. Sourced before the aliases: zsh
# expands aliases inside a function body when it parses the definition.
for _zshrc_d in "$HOME"/.zshrc.d/*.zsh(N); do source "$_zshrc_d"; done
unset _zshrc_d

# All aliases live here. Sourced last so PATH is complete: the `alert` alias
# picks its implementation with `command -v`.
[ -f "$HOME/.zsh_aliases" ] && source "$HOME/.zsh_aliases"

# Machine-local shell config (untracked)
[ -f "$HOME/.zshrc.local" ] && source "$HOME/.zshrc.local"
