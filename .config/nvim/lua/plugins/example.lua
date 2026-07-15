return {
  {
    "coder/claudecode.nvim",
    keys = {
      { "<leader>cc", "<cmd>ClaudeCode<cr>",                desc = "Claude Code" },
      { "<leader>ct", "<cmd>ClaudeCodeFocus<cr>",           desc = "Focus Claude" },
      { "<leader>cs", ":'<,'>ClaudeCodeSend<cr>",           desc = "Send to Claude", mode = "v" },
      { "<leader>cr", "<cmd>ClaudeCode --resume<cr>",       desc = "Resume Claude" },
      { "<leader>cC", "<cmd>ClaudeCode --continue<cr>",     desc = "Continue Claude" },
      { "<leader>cm", "<cmd>ClaudeCodeSelectModel<cr>",     desc = "Select Claude model" },
      { "<leader>cb", "<cmd>ClaudeCodeAdd %<cr>",           desc = "Add current buffer" },
      { "<leader>ca", "<cmd>ClaudeCodeDiffAccept<cr>",      desc = "Accept diff" },
      { "<leader>cd", "<cmd>ClaudeCodeDiffDeny<cr>",        desc = "Deny diff" },
    },
    opts = {},
  },
}
