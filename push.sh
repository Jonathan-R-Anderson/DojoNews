#!/bin/sh
# POSIX-safe batch uploader for GitHub
# - Commits/pushes in small batches
# - On push failure, falls back to per-file
# - Skips files >= SIZE_LIMIT_MB (logs them)
# - No bashisms; works with /bin/sh

set -eu

# -------- Tunables --------
BATCH_SIZE="${BATCH_SIZE:-50}"          # files per commit
SIZE_LIMIT_MB="${SIZE_LIMIT_MB:-100}"   # skip files >= this size (non-LFS)
SKIP_FILE="${SKIP_FILE:-.skip_over_${SIZE_LIMIT_MB}MB.txt}"

# Keep pushes light (helps small VPS RAM)
git config pack.threads 1 || true
git config pack.window 0  || true

# -------- Helpers --------
bytes_in_mb() { echo $((1024*1024)); }
limit_bytes=$((SIZE_LIMIT_MB * $(bytes_in_mb)))

# portable file size (Linux stat, macOS stat, or slow wc fallback)
file_size_bytes() {
  f="$1"
  if [ ! -f "$f" ]; then
    echo 0; return
  fi
  if stat -c %s "$f" >/dev/null 2>&1; then
    stat -c %s "$f"
  elif stat -f %z "$f" >/dev/null 2>&1; then
    stat -f %z "$f"
  else
    # fallback (reads file; slower)
    wc -c < "$f" | awk '{print $1}'
  fi
}

commit_and_push_batch() {
  listfile="$1"  # file containing one path per line

  # Stage everything in the list (handles spaces safely)
  changed=0
  while IFS= read -r p || [ -n "$p" ]; do
    [ -n "$p" ] || continue
    [ -f "$p" ] || continue
    git add -- "$p" || true
    changed=1
  done < "$listfile"

  # Nothing staged? skip
  if [ "$changed" -eq 0 ]; then
    return 0
  fi

  msg="Batch $(date +%F-%H%M%S)"
  if ! git commit -m "$msg" >/dev/null 2>&1; then
    # nothing to commit (shouldn't happen if changed=1), skip
    return 0
  fi

  if git push; then
    return 0
  fi

  echo "Push failed for batch; falling back to per-file..."
  # Undo the batch commit but keep staged changes
  git reset --soft HEAD~1

  # Per-file fallback
  while IFS= read -r p || [ -n "$p" ]; do
    [ -n "$p" ] || continue
    [ -f "$p" ] || continue
    git reset       >/dev/null 2>&1 || true
    git add -- "$p" >/dev/null 2>&1 || true
    if git commit -m "Single file: $p" >/dev/null 2>&1; then
      if ! git push; then
        echo "ERROR: Push failed even for single file: $p"
        echo "       Consider Git LFS or removing this file from history."
        exit 1
      fi
    fi
  done < "$listfile"
}

# -------- Build file list (modified + untracked) --------
# NOTE: we convert NUL to NL; this assumes no filenames contain newlines
# (very rare in Git repos). If they do, stop and tell me—we can switch to xargs -0.
tmpdir="$(mktemp -d)"
files_all="$tmpdir/all.txt"
files_batch="$tmpdir/batch.txt"
: > "$files_all"
: > "$files_batch"

# Get list robustly; -z uses NULs which we map to newlines
git ls-files -z -m -o --exclude-standard | tr '\0' '\n' > "$files_all"

# Filter regular files and skip huge ones
count=0
: > "$files_batch"
: > "$SKIP_FILE"

while IFS= read -r f || [ -n "$f" ]; do
  [ -n "$f" ] || continue
  [ -f "$f" ] || continue

  sz="$(file_size_bytes "$f")"
  if [ "$sz" -ge "$limit_bytes" ]; then
    echo "$f" >> "$SKIP_FILE"
    echo "Skipping $f (>= ${SIZE_LIMIT_MB}MB) -> logged to $SKIP_FILE"
    continue
  fi

  echo "$f" >> "$files_batch"
  count=$((count + 1))

  if [ "$count" -ge "$BATCH_SIZE" ]; then
    commit_and_push_batch "$files_batch"
    : > "$files_batch"
    count=0
  fi
done < "$files_all"

# Final remainder
if [ "$count" -gt 0 ]; then
  commit_and_push_batch "$files_batch"
fi

rm -rf "$tmpdir"
echo "Done. Any files >= ${SIZE_LIMIT_MB}MB are listed in $SKIP_FILE."
