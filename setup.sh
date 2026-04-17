#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMUX_CONFIG_FILE="${HOME}/.tmux.conf"
TMUX_BLOCK_START="# stratoc setup start"
TMUX_BLOCK_END="# stratoc setup end"

log() {
  printf '[setup] %s\n' "$*"
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

load_homebrew() {
  for brew_bin in \
    "$(command -v brew 2>/dev/null || true)" \
    /opt/homebrew/bin/brew \
    /usr/local/bin/brew \
    /home/linuxbrew/.linuxbrew/bin/brew
  do
    if [[ -x "$brew_bin" ]]; then
      eval "$("$brew_bin" shellenv)"
      return
    fi
  done
  echo '[setup] Homebrew not found after install' >&2
  exit 1
}

install_homebrew() {
  if has_command brew; then
    log "Homebrew already installed"
    load_homebrew
    return
  fi
  log "Installing Homebrew"
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  load_homebrew
}

install_brew_packages() {
  log "Installing tmux and mise with Homebrew"
  brew update
  brew install tmux mise
}

ensure_dotenv() {
  if [[ ! -f "$ROOT_DIR/.env" ]]; then
    log "Creating empty .env. host fills AUTHORIZATION_TOKEN on first start"
    : >"$ROOT_DIR/.env"
  fi
  chmod 600 "$ROOT_DIR/.env"
}

rewrite_tmux_config() {
  python3 - "$TMUX_CONFIG_FILE" "$TMUX_BLOCK_START" "$TMUX_BLOCK_END" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
start = sys.argv[2]
end = sys.argv[3]
block = "\n".join([
    start,
    'set -g extended-keys on',
    'set -g extended-keys-format csi-u',
    'set -g default-terminal "tmux-256color"',
    'set -sg escape-time 0',
    end,
])
text = path.read_text() if path.exists() else ""
lines = text.splitlines()
out = []
skip = False
for line in lines:
    if line == start:
        skip = True
        continue
    if skip and line == end:
        skip = False
        continue
    if not skip:
        out.append(line)
out = [line for line in out if line.strip() != ""]
new_text = "\n".join(out + [block]) + "\n"
path.write_text(new_text)
PY
}

validate_tmux_config() {
  local socket_name="stratoc-setup"
  tmux -L "$socket_name" kill-server >/dev/null 2>&1 || true
  tmux -L "$socket_name" -f "$TMUX_CONFIG_FILE" new-session -d -s "$socket_name"
  [[ "$(tmux -L "$socket_name" show -gv extended-keys)" == "on" ]]
  [[ "$(tmux -L "$socket_name" show -gv extended-keys-format)" == "csi-u" ]]
  tmux -L "$socket_name" kill-server >/dev/null 2>&1 || true
}

configure_tmux() {
  log "Updating ~/.tmux.conf for extended keys"
  rewrite_tmux_config
  validate_tmux_config
  if tmux list-sessions >/dev/null 2>&1; then
    log "Reloading current tmux server config"
    tmux source-file "$TMUX_CONFIG_FILE" || true
  fi
}

trust_and_install_tools() {
  log "Trusting mise config"
  mise trust -y -C "$HOME" "$ROOT_DIR/.mise.toml"
  log "Installing mise tools"
  mise -C "$ROOT_DIR" install
}

install_hooks() {
  log "Installing lefthook hooks"
  mise -C "$ROOT_DIR" exec -- lefthook install
}

restart_tmux_server() {
  log "Restarting tmux server to apply config"
  tmux kill-server >/dev/null 2>&1 || true
}

build_project() {
  log "Running tests"
  mise -C "$ROOT_DIR" exec -- make test
  log "Building host and terminal"
  mise -C "$ROOT_DIR" exec -- make build
}

main() {
  install_homebrew
  install_brew_packages
  ensure_dotenv
  configure_tmux
  trust_and_install_tools
  install_hooks
  build_project
  restart_tmux_server
  log "LAN discovery uses mDNS and requires HTTPS-enabled host certificates"
  log "Setup complete"
}

main "$@"
