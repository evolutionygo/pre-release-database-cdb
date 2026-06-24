#!/bin/bash

set -euo pipefail

usage() {
  echo "Usage: $0 <target-dir> <branch> [depth]" >&2
  exit 1
}

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  usage
fi

target_dir="$1"
branch="$2"
depth="${3:-}"
repo_url="https://code.moenext.com/mycard/ygopro-scripts-888"

depth_args=()
if [ -n "$depth" ]; then
  depth_args=("--depth=$depth")
fi

git clone "${depth_args[@]}" --branch "$branch" "$repo_url" "$target_dir"

if [ "$branch" = "master" ]; then
  exit 0
fi

git -C "$target_dir" fetch "${depth_args[@]}" origin +refs/heads/master:refs/remotes/origin/master

current_time=$(git -C "$target_dir" log -1 --format=%ct HEAD)
master_time=$(git -C "$target_dir" log -1 --format=%ct origin/master)

if [ "$master_time" -gt "$current_time" ]; then
  echo "origin/master is newer than $branch, switching to origin/master."
  git -C "$target_dir" checkout -B master origin/master
else
  echo "$branch is up to date with origin/master."
fi
