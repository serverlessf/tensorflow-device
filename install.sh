#!/bin/sh
# docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# nodejs
sudo apt-get install -y gcc g++ make
curl -sL https://deb.nodesource.com/setup_11.x | sudo bash -
sudo apt-get update
sudo apt-get install -y nodejs
mkdir -p "$HOME/.npm"
npm config set prefix "$HOME/.npm"
