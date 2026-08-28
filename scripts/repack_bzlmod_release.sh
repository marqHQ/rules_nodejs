#!/usr/bin/env bash
# Produces the bzlmod-enabled release tarball without rebuilding the whole
# distro with Bazel 3.0.0.
#
# `bazel build //:release` runs pkg_npm over the source tree, which strips the
# BEGIN-INTERNAL blocks, mocks out the @bazel_skylib bzl_library loads, and adds
# two generated JS files that are not checked in. Every file this change touches
# is unaffected by those transformations, so the published tarball plus the
# changed files is byte-identical to what //:release would emit.
#
# Usage: scripts/repack_bzlmod_release.sh [base-release.tar.gz]

set -euo pipefail

readonly REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly BASE_URL="https://github.com/marqHQ/rules_nodejs/releases/download/marq_2024-06-03/release.tar.gz"
readonly BASE_SHA256="b2198aac3a3a84c8c6660fa90c1139893bcfbe1ae9c60df98bead85a2076d608"
readonly OUT_DIR="${REPO}/dist/bzlmod"
readonly STAGE="${OUT_DIR}/release"

# Files taken verbatim from the source tree. They must not contain a
# BEGIN-INTERNAL block or a bzl_library load, or pkg_npm would rewrite them.
readonly OVERLAY=(
  MODULE.bazel
  extensions.bzl
  internal/node/launcher.sh
  internal/node/node.bzl
  internal/node/node_repositories.bzl
)

base="${1:-}"
if [[ -z "${base}" ]]; then
  base="${OUT_DIR}/base-release.tar.gz"
  mkdir -p "${OUT_DIR}"
  [[ -f "${base}" ]] || curl -fsSL -o "${base}" "${BASE_URL}"
fi
echo "${BASE_SHA256}  ${base}" | sha256sum --check --status

# The distro tarball carries read-only directories; make the staging tree writable.
[[ -d "${STAGE}" ]] && chmod -R u+w "${STAGE}"
rm -rf "${STAGE}"
mkdir -p "${STAGE}"
tar xzf "${base}" -C "${STAGE}"
chmod -R u+w "${STAGE}"

for f in "${OVERLAY[@]}"; do
  if grep -q 'BEGIN-INTERNAL\|@bazel_skylib//:bzl_library.bzl' "${REPO}/${f}"; then
    echo "ERROR: ${f} needs a pkg_npm transformation; rebuild with //:release" >&2
    exit 1
  fi
  mkdir -p "$(dirname "${STAGE}/${f}")"
  cp "${REPO}/${f}" "${STAGE}/${f}"
done

tar czf "${OUT_DIR}/release.tar.gz" --sort=name --owner=0 --group=0 --numeric-owner \
  --mtime='UTC 2020-01-01' -C "${STAGE}" .

echo "wrote ${OUT_DIR}/release.tar.gz"
sha256sum "${OUT_DIR}/release.tar.gz"
