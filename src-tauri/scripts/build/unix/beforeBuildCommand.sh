#!/usr/bin/env bash

# shellcheck source=./quasar.sh
source "$(dirname "$0")/quasar.sh"

run-quasar-command build
