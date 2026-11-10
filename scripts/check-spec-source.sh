#!/usr/bin/env bash
# test/spec/public-card.json must be the iOS repo's file at the commit named in SPEC_SOURCE. CI has no
# access to the private iOS repo, so it checks the SHA-256 recorded there (an edit here fails). With a
# path to an iOS checkout (argument or IOS_REPO), it also compares the bytes with `git show` (read only).
set -euo pipefail
dir="$(cd "$(dirname "$0")/.." && pwd)"
file="$dir/test/spec/public-card.json"
read -r repo commit path sha < "$dir/test/spec/SPEC_SOURCE"
want="${sha#sha256=}"
got="$( (command -v sha256sum >/dev/null && sha256sum "$file" || shasum -a 256 "$file") | cut -d' ' -f1)"
if [ "$got" != "$want" ]; then
  echo "check-spec-source: public-card.json has SHA-256 $got, SPEC_SOURCE records $want" >&2
  exit 1
fi
ios="${1:-${IOS_REPO:-}}"
if [ -n "$ios" ]; then
  if ! git -C "$ios" cat-file -e "$commit:$path" 2>/dev/null; then
    echo "check-spec-source: $commit:$path not in $ios (fetch it first)" >&2
    exit 1
  fi
  if ! git -C "$ios" show "$commit:$path" | cmp -s - "$file"; then
    echo "check-spec-source: public-card.json differs from $repo@$commit:$path" >&2
    exit 1
  fi
  echo "check-spec-source: public-card.json is $repo@${commit:0:8}:$path"
else
  echo "check-spec-source: public-card.json matches its recorded SHA-256 (no iOS checkout given)"
fi
