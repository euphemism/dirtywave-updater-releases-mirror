# Dirt Loader

## Description

Firmware upload tool for the Dirtywave M8 Tracker.

## Contributing

### Development Environment Setup

Follow these steps to set up your development environment:

We recommend using [Visual Studio Code](https://code.visualstudio.com/) as your editor for this project. To ensure that you have the best development experience, please install the workspace-recommended extensions.

#### Prerequisites

- [devenv](https://devenv.sh/)

##### Recommended

- [direnv](https://direnv.net/) - Automatic environment activation (No need to invoke `devenv shell`)

#### Clone the Repository

```sh
git clone git@github.com:euphemism/dirt-loader.git
cd dirt-loader
```

#### Enter the Development Environment

```sh
devenv shell
```

#### Starting Application for Development

For Desktop development, run:
```sh
tauri-cli dev
```