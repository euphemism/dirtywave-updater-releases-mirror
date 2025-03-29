#!/usr/bin/env bash

run-quasar-command() {
    local PREFIX=

    if [ -z "$DEVENV_ROOT" ]; then
        PREFIX="cd ./src-quasar && bunx @quasar/cli"
    else
        PREFIX="quasar-cli"
    fi

    local COMMAND="$PREFIX $*"

    echo "Running command: $COMMAND"

    eval "$COMMAND"
}
