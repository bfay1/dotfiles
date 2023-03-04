set number
set autoindent
set tabstop=4
set hlsearch
set incsearch
set title
set wrap
set shiftround
set shiftwidth=4
set smartcase
set cursorline
set noerrorbells
set wildmenu

inoremap { {}<Esc>ha
inoremap ( ()<Esc>ha
inoremap [ []<Esc>ha
inoremap " ""<Esc>ha
inoremap ' ''<Esc>ha
inoremap ` ``<Esc>ha

autocmd VimEnter * NERDTree | wincmd p

" Exit Vim if NERDTree is the only window remaining in the only tab."
autocmd BufEnter * if tabpagenr('$') == 1 && winnr('$') == 1 && exists('b:NERDTree') && b:NERDTree.isTabTree() | quit | endif


call plug#begin()

Plug 'chriskempson/base16-vim'
Plug 'octol/vim-cpp-enhanced-highlight'
Plug 'hdima/python-syntax'
Plug 'raimondi/delimitmate'
Plug 'vim-scripts/c.vim'
Plug 'junegunn/seoul256.vim'
Plug 'preservim/NERDTree'
Plug 'othree/html5.vim'

call plug#end()

let g:seoul256_background=233
colo seoul256

