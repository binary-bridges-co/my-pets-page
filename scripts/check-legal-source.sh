#!/usr/bin/env bash
# The Help, Privacy and Terms texts in site/src/content/legal/ are the iOS repo's Store/website files at
# the commits named in LEGAL_SOURCE, without their leading <!-- ... --> note for maintainers. CI has no
# access to the private iOS repo, so it checks the SHA-256 recorded there (an edit here fails). With a
# path to an iOS checkout (argument or IOS_REPO), it also compares the text with `git show` (read only).
set -euo pipefail
dir="$(cd "$(dirname "$0")/.." && pwd)"
ios="${1:-${IOS_REPO:-}}"
sha() { (command -v sha256sum >/dev/null && sha256sum "$1" || shasum -a 256 "$1") | cut -d' ' -f1; }
# Drops a leading HTML comment and the one blank line after it.
strip() { awk 'NR==1 && /^<!--/ {c=1} c==1 { if (/^-->$/) {c=0; s=1}; next } s==1 && /^$/ {s=0; next} {s=0; print}'; }
count=0
while read -r repo commit path want local; do
  [ -z "${repo:-}" ] && continue
  file="$dir/$local"
  got="$(sha "$file")"
  if [ "sha256=$got" != "$want" ]; then
    echo "check-legal-source: $local has SHA-256 $got, LEGAL_SOURCE records ${want#sha256=}" >&2
    exit 1
  fi
  if [ -n "$ios" ]; then
    if ! git -C "$ios" cat-file -e "$commit:$path" 2>/dev/null; then
      echo "check-legal-source: $commit:$path not in $ios (fetch it first)" >&2
      exit 1
    fi
    if ! git -C "$ios" show "$commit:$path" | strip | cmp -s - "$file"; then
      echo "check-legal-source: $local differs from $repo@$commit:$path" >&2
      exit 1
    fi
  fi
  count=$((count + 1))
done < "$dir/site/src/content/legal/LEGAL_SOURCE"
if [ "$count" -ne 6 ]; then
  echo "check-legal-source: LEGAL_SOURCE lists $count texts, want 6 (help, privacy, terms in en and es)" >&2
  exit 1
fi
if [ -n "$ios" ]; then echo "check-legal-source: the $count texts are the iOS repo's, as LEGAL_SOURCE says"
else echo "check-legal-source: the $count texts match their recorded SHA-256 (no iOS checkout given)"; fi
