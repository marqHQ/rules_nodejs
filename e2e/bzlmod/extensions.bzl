"""Consumer-side extension driving yarn_install, mirroring what the monorepo does."""

load("@build_bazel_rules_nodejs//:extensions.bzl", "yarn_install")

def _deps_impl(_module_ctx):
    yarn_install(
        name = "npm",
        args = ["--ignore-optional"],
        data = ["//:postinstall.js"],
        environment = {"SOME_USER_ENV": "yarn is great!"},
        package_json = "//:package.json",
        quiet = False,
        # Bazel 7 removed WORKSPACE managed_directories, which this attribute
        # depends on when enabled.
        symlink_node_modules = False,
        use_global_yarn_cache = True,
        yarn_lock = "//:yarn.lock",
    )

deps = module_extension(implementation = _deps_impl)
