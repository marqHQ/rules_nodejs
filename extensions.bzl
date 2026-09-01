# Copyright 2024 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Module extensions for bzlmod.

`node_repositories()` is a WORKSPACE-only macro: it calls
`native.register_toolchains` and `native.existing_rules`, neither of which is
callable on a module extension thread. The `node` extension below does the same
work with the underlying repository rules; toolchain registration moves to the
`register_toolchains()` calls in this module's MODULE.bazel.
"""

load("//internal/common:os_name.bzl", "OS_ARCH_NAMES")
load(
    "//internal/node:node_repositories.bzl",
    "node_repositories_rule",
    "nodejs_repo_host_os_alias",
)
load(
    "//internal/npm_install:npm_install.bzl",
    _npm_install = "npm_install",
    _yarn_install = "yarn_install",
)
load("//toolchains/node:node_toolchain_configure.bzl", "node_toolchain_configure")

# The `yarn_install`/`npm_install` exported from //:index.bzl are macros that
# call node_repositories(); these are the bare repository rules, which is what a
# module extension has to call.
yarn_install = _yarn_install
npm_install = _npm_install

_DEFAULT_NODE_URLS = [
    "https://mirror.bazel.build/nodejs.org/dist/v{version}/{filename}",
    "https://nodejs.org/dist/v{version}/{filename}",
]

_DEFAULT_YARN_URLS = [
    "https://mirror.bazel.build/github.com/yarnpkg/yarn/releases/download/v{version}/{filename}",
    "https://github.com/yarnpkg/yarn/releases/download/v{version}/{filename}",
]

# Mirrors the subset of node_repositories() arguments that survives the move to
# bzlmod; the values are also the defaults of the equivalent tag attributes.
_DEFAULT_SETTINGS = {
    "node_repositories": {},
    "node_urls": _DEFAULT_NODE_URLS,
    "node_version": "12.13.0",
    "preserve_symlinks": True,
    "yarn_repositories": {},
    "yarn_urls": _DEFAULT_YARN_URLS,
    "yarn_version": "1.19.1",
}

toolchain = tag_class(attrs = {
    "node_repositories": attr.string_list_dict(
        doc = """Custom map of NodeJS versions to (filename, strip_prefix, sha256) tuples.

Keys are `<version>-<os>_<arch>`, e.g. `14.15.0-linux_amd64`. Empty means "use
the built-in list of public NodeJS releases".""",
    ),
    "node_urls": attr.string_list(
        default = _DEFAULT_NODE_URLS,
        doc = "Download URL templates for NodeJS; `{version}` and `{filename}` are substituted.",
    ),
    "node_version": attr.string(
        default = _DEFAULT_SETTINGS["node_version"],
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
        default = _DEFAULT_YARN_URLS,
        doc = "Download URL templates for Yarn; `{version}` and `{filename}` are substituted.",
    ),
    "yarn_version": attr.string(
        default = _DEFAULT_SETTINGS["yarn_version"],
        doc = "The specific version of Yarn to install.",
    ),
})

def _settings_from_tag(tag):
    return {name: getattr(tag, name) for name in _DEFAULT_SETTINGS.keys()}

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
    if root_settings:
        return root_settings
    if dep_settings:
        return dep_settings
    return dict(_DEFAULT_SETTINGS)

def _node_impl(module_ctx):
    settings = _resolve_settings(module_ctx)

    for os_arch_name in OS_ARCH_NAMES:
        os_name = "_".join(os_arch_name)
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
