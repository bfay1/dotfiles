PATH="/usr/local/bin:$PATH"
eval "$(/opt/homebrew/bin/brew shellenv)"

test -e "${HOME}/.iterm2_shell_integration.bash" && source "${HOME}/.iterm2_shell_integration.bash"

source ~/.bashrc

# opam configuration
test -r /Users/brendan/.opam/opam-init/init.sh && . /Users/brendan/.opam/opam-init/init.sh > /dev/null 2> /dev/null || true
