#!/usr/bin/env bash

set -o nounset -o pipefail -o errexit

configure-binary-caches() {
    echo "Configuring usuage of binary cache substituters for user"

    mkdir -p "$HOME/.config/nix"

    substituters=$(get-substituters)

    local CONFIGURATION_FILE="$HOME/.config/nix/nix.conf"
    local CONFIGURATION_STRING="substituters = $substituters"

    # Indicate that the user wishes to use the specified substituters for binary caches
    if [ ! -f "$CONFIGURATION_FILE" ] || (! grep -q "$CONFIGURATION_STRING" "$CONFIGURATION_FILE"); then
        echo "$CONFIGURATION_STRING" >>"$CONFIGURATION_FILE"
    else
        echo "Binary caches already added to user-level Nix config"
    fi
}

configure-direnv() {
    write-direnv-config

    install-direnv-shell-hooks
}

get-substituters() {
    # Substituters to use to pull down cached binaries instead of building from source; where possible
    substituters='https://cache.nixos.org '
    substituters+='https://cachix.cachix.org '
    substituters+='https://devenv.cachix.org '
    substituters+='https://nix-community.cachix.org'

    echo "$substituters"
}

get-substituter-keys() {
    # The public keys for the binary cache substituters
    keys='cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY= '
    keys+='cachix.cachix.org-1:eWNHQldwUO7G2VkjpnjDbWwy4KQ/HNxht7H4SSoMckM= '
    keys+='devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw= '
    keys+='nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs='

    echo "$keys"
}

bootstrap() {
    install-nix

    if [ -d "/nix" ]; then
        run-post-install-steps
    else
        echo "/nix volume not found, skipping post-nix-install-steps"

        echo "Install unsuccessful"
    fi
}

install-direnv-shell-hook() {
    if [ -e "$1" ]; then
        if ! grep -q "$2" "$1"; then
            echo -e "\n$2" >>"$1"

            echo "Added direnv hook to $1."
        else
            echo "direnv hook already exists in $1. Skipping hook installation."
        fi
    else
        echo "$1 does not exist. Skipping hook installation."
    fi
}

install-direnv-shell-hooks() {
    echo "Installing shell hooks for direnv"

    local BASH_CONFIG_FILE=$HOME/.bashrc
    local BASH_HOOK='eval "$(direnv hook bash)"'

    # Some people don't have a ~/.bashrc for some reason
    touch "$BASH_CONFIG_FILE"

    local FISH_CONFIG_FILE=$HOME/.config/fish/config.fish
    local FISH_HOOK="direnv hook fish | source"

    local ZSH_CONFIG_FILE=$HOME/.zshrc
    local ZSH_HOOK='eval "$(direnv hook zsh)"'

    # Some people don't have a ~/.zshrc for some reason
    touch "$ZSH_CONFIG_FILE"

    install-direnv-shell-hook "$BASH_CONFIG_FILE" "$BASH_HOOK"
    install-direnv-shell-hook "$FISH_CONFIG_FILE" "$FISH_HOOK"
    install-direnv-shell-hook "$ZSH_CONFIG_FILE" "$ZSH_HOOK"
}

install-nix() {
    local keys
    keys=$(get-substituter-keys)

    local substituters
    substituters=$(get-substituters)

    local args=()

    # Extra configuration rationale:
    # https://web.archive.org/web/20241231202538/https://jackson.dev/post/nix-reasonable-defaults/
    args+=("--diagnostic-endpoint" "")
    args+=("--extra-conf" "trusted-substituters = $substituters")
    args+=("--extra-conf" "trusted-public-keys = $keys")
    args+=("--extra-conf" "connect-timeout = 5")
    args+=("--extra-conf" "log-lines = 25")
    args+=("--extra-conf" "min-free = 128000000")
    args+=("--extra-conf" "max-free = 1000000000")
    args+=("--extra-conf" "fallback = true")
    args+=("--extra-conf" "warn-dirty = false")
    args+=("--extra-conf" "auto-optimise-store = true")
    args+=("--no-confirm")

    local EXIT_CODE=0

    curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix |
        sh -s -- install "${args[@]}" || EXIT_CODE=$?

    if [ "$EXIT_CODE" -ne 0 ]; then
        echo "Nix installer exited with error; skipping post-nix-install steps"

        return 1
    fi
}

install-packages-to-nix-profile() {
    local NIXPKGS_CHANNEL=nixpkgs/nixpkgs-unstable

    local packages=()

    for i in "$@"; do
        local SCOPED_PACKAGE="$NIXPKGS_CHANNEL#$i"

        packages+=("$SCOPED_PACKAGE")

        echo "Installing $SCOPED_PACKAGE for the current (default) Nix profile"
    done

    # Don't yet have access to updated $PATH, so absolute path to Nix binary is used
    /nix/var/nix/profiles/default/bin/nix profile install "${packages[@]}"
}

run-post-install-steps() {
    printf "Running post-nix-install steps:\n"

    configure-binary-caches

    start-nix-daemon

    # devenv - Manages local development environments - https://devenv.sh/
    # direnv - Loads and unloads environment variables depending on the current directory; Automatically instantiates the devenv-managed environment - https://direnv.net/
    # nixd   - Nix language server - https://github.com/nix-community/nixd
    # nixfmt - Nix formatter - https://github.com/NoxOS/nixfmt
    install-packages-to-nix-profile devenv direnv nixd nixfmt

    configure-direnv

    echo "Installation complete"
}

start-nix-daemon() {
    echo "Starting Nix daemon"

    echo ". /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh" | sh -s
}

write-direnv-config() {
    local DIRENV_DIR="$HOME/.config/direnv"
    local DIRENV_CONFIG_FILE="$DIRENV_DIR/direnv.toml"

    mkdir -p "$DIRENV_DIR"
    touch "$DIRENV_CONFIG_FILE"

    # Prevent direnv from printing environment variable diff on activation
    if ! grep -q "hide_env_diff" "$DIRENV_CONFIG_FILE"; then
        printf '%s\n' '[global]' 'hide_env_diff = true' >"$DIRENV_CONFIG_FILE"
    fi
}

bootstrap
