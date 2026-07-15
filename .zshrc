alias ls='ls -G'
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias grep='grep --color=auto'
alias fgrep='fgrep --color=auto'
alias egrep='egrep --color=auto'
alias code='nvim'
alias vim='nvim'
alias claude='claude --dangerously-skip-permissions'
export PATH="$HOME/.local/bin:$PATH"

# colored GCC warnings and errors
export GCC_COLORS='error=01;31:warning=01;35:note=01;36:caret=01;32:locus=01:quote=01'

long_ls() {
  local VAR="Permissions|Owner|Group|Size|Modified|Name"
  if [ ! "${1}" ]; then
    echo -e "$VAR" | column -t -s"|" && ls -l
  else
    echo -e "$VAR" | column -t -s"|" && ls -l "${1}"
  fi
}
alias lls='long_ls'

# Add an "alert" alias for long running commands. Use like so:
#   sleep 10; alert
if command -v notify-send >/dev/null 2>&1; then
  alias alert='notify-send --urgency=low -i "$([ $? = 0 ] && echo terminal || echo error)" "$(history|tail -n1|sed -e '\''s/^\s*[0-9]\+\s*//;s/[;&|]\s*alert$//'\'')"'
elif command -v osascript >/dev/null 2>&1; then
  alias alert='osascript -e "display notification \"$(history|tail -n1|sed -e '\''s/^\s*[0-9]\+\s*//;s/[;&|]\s*alert$//'\'')\" with title \"$([ $? = 0 ] && echo Done || echo Error)\""'
fi

gitinit() {
  git init .
  git add .
  git commit -m "first commit"
  git remote add origin $1
  git push --set-upstream origin master
}

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
