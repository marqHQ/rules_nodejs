# bzlmod smoke test

Consumes `build_bazel_rules_nodejs` as a Bazel module: the `node` extension
downloads Node 14.15.0 from a custom `node_repositories` dict, a consumer-side
extension drives `yarn_install`, and a `nodejs_binary`/`nodejs_test` pair
resolves a package out of `@npm`.

`local_path_override` points at the tree that
`scripts/repack_bzlmod_release.sh` writes to `dist/bzlmod/release`, so build the
distro first:

```sh
scripts/repack_bzlmod_release.sh
cd e2e/bzlmod
USE_BAZEL_VERSION=7.7.1 bazel run //:main
USE_BAZEL_VERSION=7.7.1 bazel test //:main_test
```

Real consumers use `archive_override` against the published `release.tar.gz`
instead of `local_path_override`.
