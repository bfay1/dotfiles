return {
  {
    "coder/claudecode.nvim",
    keys = {
      { "<leader>a",  nil,                                   desc = "AI/Claude Code" },
      { "<leader>ac", "<cmd>ClaudeCode<cr>",                  desc = "Toggle Claude" },
      { "<leader>af", "<cmd>ClaudeCodeFocus<cr>",             desc = "Focus Claude" },
      { "<leader>as", ":'<,'>ClaudeCodeSend<cr>",             desc = "Send to Claude", mode = "v" },
      { "<leader>ar", "<cmd>ClaudeCode --resume<cr>",         desc = "Resume Claude" },
      { "<leader>aC", "<cmd>ClaudeCode --continue<cr>",       desc = "Continue Claude" },
      { "<leader>am", "<cmd>ClaudeCodeSelectModel<cr>",       desc = "Select Claude model" },
      { "<leader>ab", "<cmd>ClaudeCodeAdd %<cr>",             desc = "Add current buffer" },
      { "<leader>aa", "<cmd>ClaudeCodeDiffAccept<cr>",        desc = "Accept diff" },
      { "<leader>ad", "<cmd>ClaudeCodeDiffDeny<cr>",          desc = "Deny diff" },
    },
    opts = {},
  },
}
