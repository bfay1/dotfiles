# Environment

- Login shell is **zsh** (`~/.zshrc`, `~/.zprofile`). `~/.bashrc` is a legacy/secondary file for when bash is invoked explicitly — it is not sourced by the login shell. Keep working config (aliases, functions, exports) in `.zshrc` as the source of truth; port to `.bashrc` only if asked.
- Editor is **Neovim via LazyVim** (`~/.config/nvim`). Manage plugins/language support through LazyVim's extras system (`extras` array in `lazyvim.json`, full dotted module paths like `lazyvim.plugins.extras.lang.python`) rather than hand-rolled plugin specs, unless the plugin isn't a LazyVim extra.
- **tmux + nvim pane navigation** is unified via `vim-tmux-navigator`: matching `Ctrl-h/j/k/l` bindings exist in both `~/.config/nvim/lua/config/keymaps.lua` and `~/.tmux.conf`. Keep them in sync if either changes.
- Primary project stack: Python (`~/rumble-poller`, `~/ig`), TypeScript/Next.js (`~/dashboard`, `~/blartclaw`), C++ (`~/cp`).

# Working agreements

- Do not remove or modify `alias claude="claude --dangerously-skip-permissions"` in `.zshrc`/`.bashrc` as a side effect of unrelated work — it's an intentional, confirmed choice. Fine to mention it if directly relevant, but don't touch it or re-ask without new context.
- For dotfile/config changes with real behavioral tradeoffs (not just bugfixes), ask before applying rather than assuming a default.
