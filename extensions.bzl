"""Module extensions for bzlmod.

`node_repositories()` is a WORKSPACE-only macro: it calls
`native.register_toolchains` and `native.existing_rules`, neither of which is
callable on a module extension thread. The `node` extension below does the same
work with the underlying repository rules; toolchain registration moves to the
`register_toolchains()` calls in this module's MODULE.bazel.
"""

load("//internal/npm_install:npm_install.bzl", _npm_install = "npm_install", _yarn_install = "yarn_install")
load("//nodejs:repositories.bzl", "DEFAULT_NODE_VERSION", node_repositories_rule = "node_repositories")
load("//nodejs/private:nodejs_repo_host_os_alias.bzl", "nodejs_repo_host_os_alias")
load("//nodejs/private:os_name.bzl", "OS_NAMES")
load("//toolchains/node:node_toolchain_configure.bzl", "node_toolchain_configure")

# The `yarn_install`/`npm_install` exported from //:index.bzl are macros that
# call node_repositories(); these are the bare repository rules, which is what a
# module extension has to call.
yarn_install = _yarn_install
npm_install = _npm_install

_OPTIONAL_SETTINGS = [
    "node_repositories",
    "node_urls",
    "yarn_repositories",
    "yarn_urls",
    "yarn_version",
]

toolchain = tag_class(attrs = {
    "node_repositories": attr.string_list_dict(
        doc = """Custom map of NodeJS versions to (filename, strip_prefix, sha256) tuples.

Keys are `<version>-<os>_<arch>`, e.g. `14.15.0-linux_amd64`. Empty means "use
the built-in list of public NodeJS releases".""",
    ),
    "node_urls": attr.string_list(
        doc = "Download URL templates for NodeJS; `{version}` and `{filename}` are substituted.",
    ),
    "node_version": attr.string(
        default = DEFAULT_NODE_VERSION,
        doc = "The specific version of NodeJS to install.",
    ),
    "preserve_symlinks": attr.bool(
        default = True,
        doc = "Turn on --node_options=--preserve-symlinks for nodejs_binary and nodejs_test rules.",
    ),
    "yarn_repositories": attr.string_list_dict(
        doc = "Custom map of Yarn versions to (filename, strip_prefix, sha256) tuples.",
    ),
    "yarn_urls": attr.string_list(
        doc = "Download URL templates for Yarn; `{version}` and `{filename}` are substituted.",
    ),
    "yarn_version": attr.string(
        doc = "The specific version of Yarn to install.",
    ),
})

def _settings_from_tag(tag):
    settings = {
        "node_version": tag.node_version,
        "preserve_symlinks": tag.preserve_symlinks,
    }
    for name in _OPTIONAL_SETTINGS:
        value = getattr(tag, name)
        if value:
            settings[name] = value
    return settings

def _resolve_settings(module_ctx):
    """The root module's tag wins; otherwise the last tag seen wins."""
    root_settings = None
    dep_settings = None
    for mod in module_ctx.modules:
        for tag in mod.tags.toolchain:
            if mod.is_root:
                root_settings = _settings_from_tag(tag)
            else:
                dep_settings = _settings_from_tag(tag)
    return root_settings or dep_settings or {}

def _node_impl(module_ctx):
    settings = _resolve_settings(module_ctx)

    # Every platform gets a repository, because MODULE.bazel has to name them all
    # in use_repo(); each one is only fetched when its toolchain is selected.
    for os_name in OS_NAMES:
        node_repository_name = "nodejs_%s" % os_name
        node_repositories_rule(
            name = node_repository_name,
            **settings
        )
        node_toolchain_configure(
            name = "%s_config" % node_repository_name,
            target_tool = "@%s//:node_bin" % node_repository_name,
        )

    # Convenience repo aliasing @nodejs_<host_os>_<host_arch>. Label defaults in
    # internal/node/node.bzl and internal/pkg_npm/pkg_npm.bzl point at it.
    nodejs_repo_host_os_alias(name = "nodejs")

node = module_extension(
    implementation = _node_impl,
    tag_classes = {"toolchain": toolchain},
    doc = """Downloads NodeJS and Yarn and configures the node toolchains.

The bzlmod replacement for the `node_repositories()` WORKSPACE macro. The
toolchains themselves are registered by this module's MODULE.bazel, so a
consumer only needs `bazel_dep` plus, optionally, a `node.toolchain(...)` tag to
pin a version.""",
)
