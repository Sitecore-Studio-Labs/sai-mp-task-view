# Local Github Actions Pipeline

## Prerequiresites

- `Docker` should be installed
- `Act` should be installed

### Installation Methods for act

- `macOS (Homebrew)`: brew install act
- `Windows (Scoop)`: scoop install act
- `Windows (Chocolatey)`: choco install act
- `Linux/macOS (curl)`: curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

### Docker Installation

- Go to the [Official Docker site](https://www.docker.com/products/docker-desktop/) download from here

## How to run pipeline locally

- Open a terminal / powershell
- Give this command

```cmd
act -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-24.04
```

This will starts a docker container with this given image in the background and run the pipeline

### Why do be care about run pipeline locally

- To check the pipeline without pushing the code to `Github`
- Github Actions is no longer free but we do have some kind of free quota
- So We can save some amount of pipeline runtime
