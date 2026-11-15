-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here
local map = vim.keymap.set

map("n", ";", ":", { noremap = true })

-- Seamless pane navigation across tmux splits and nvim windows
-- (pairs with the tmux-side Ctrl-hjkl bindings in ~/.tmux.conf)
map("n", "<C-h>", "<cmd>TmuxNavigateLeft<cr>", { desc = "Go to Left Window" })
map("n", "<C-j>", "<cmd>TmuxNavigateDown<cr>", { desc = "Go to Lower Window" })
map("n", "<C-k>", "<cmd>TmuxNavigateUp<cr>", { desc = "Go to Upper Window" })
map("n", "<C-l>", "<cmd>TmuxNavigateRight<cr>", { desc = "Go to Right Window" })
