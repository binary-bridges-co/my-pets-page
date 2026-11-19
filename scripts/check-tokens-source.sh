#!/usr/bin/env bash
# The design tokens and the Bridge cat marks in site/ are byte copies of bb-context files at the commit
# named in site/TOKENS_SOURCE (one line per file: repository, commit, path there, sha256, path here).
# CI only sees this repository, so it checks the recorded SHA-256 (an edit here fails). With a path to a
# bb-context checkout (argument or BB_CONTEXT), it also compares the bytes with `git show` (read only).
set -euo pipefail
dir="$(cd "$(dirname "$0")/.." && pwd)"
context="${1:-${BB_CONTEXT:-}}"
sha() { (command -v sha256sum >/dev/null && sha256sum "$1" || shasum -a 256 "$1") | cut -d' ' -f1; }
status=0
lines=0
while read -r repo commit path recorded local; do
  [ -z "${repo:-}" ] && continue
  lines=$((lines + 1))
  file="$dir/$local"
  if [ ! -f "$file" ]; then
    echo "check-tokens-source: $local is missing (copy $repo@${commit:0:8}:$path)" >&2
    status=1
    continue
  fi
  want="${recorded#sha256=}"
  got="$(sha "$file")"
  if [ "$got" != "$want" ]; then
    echo "check-tokens-source: $local has SHA-256 $got, TOKENS_SOURCE records $want" >&2
    status=1
    continue
  fi
  if [ -n "$context" ]; then
    if ! git -C "$context" cat-file -e "$commit:$path" 2>/dev/null; then
      echo "check-tokens-source: $commit:$path not in $context (fetch it first)" >&2
      status=1
    elif ! git -C "$context" show "$commit:$path" | cmp -s - "$file"; then
      echo "check-tokens-source: $local differs from $repo@$commit:$path" >&2
      status=1
    else
      echo "check-tokens-source: $local is $repo@${commit:0:8}:$path"
    fi
  else
    echo "check-tokens-source: $local matches its recorded SHA-256 (no bb-context checkout given)"
  fi
done < "$dir/site/TOKENS_SOURCE"
if [ "$lines" -eq 0 ]; then
  echo "check-tokens-source: site/TOKENS_SOURCE lists no file" >&2
  exit 1
fi
exit "$status"
