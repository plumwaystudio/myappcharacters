#!/usr/bin/env bash
# One-time setup: JS libraries + MakeHuman shape targets (CC0) used to rebuild characters.
set -e
npm install
mkdir -p /tmp/mh && pip download --no-deps -q makehuman==1.3.2 -d /tmp/mh
unzip -o -q /tmp/mh/makehuman-1.3.2-py3-none-any.whl 'makehuman/data/targets.npz' -d /tmp/mh/x
cp /tmp/mh/x/makehuman/data/targets.npz base/targets.npz
echo "Ready."
