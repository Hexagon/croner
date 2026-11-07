# Where to publish Croner for C++

## Summary

1. Move the port to its own repository, `hexagon/croner-cpp`, like `hexagon/croner-rust`.
2. Tag `v0.1.0` and publish a GitHub release. Users can then consume it right away with CMake
   `FetchContent`, CPM.cmake, or by copying the headers.
3. Submit a **vcpkg** port and a **Conan Center** recipe. The name `croner` is free in both
   (checked 2026-11-07). Start with vcpkg, which reviews faster.
4. Add a "C++" page to croner.56k.guru, and link it from the READMEs of the JavaScript and
   Rust versions.
5. Later, if users ask for them: Meson WrapDB, xmake-repo, build2 (cppget.org), and Linux
   distribution packages.

## Own repository or a subdirectory of hexagon/croner?

The port currently lives in `cpp/` in the JavaScript repository, which works for development.
The differential test imports `../../src/croner.ts` directly, and `cpp/` is kept out of the npm
and JSR packages. Publishing should still happen from a separate repository:

| | Subdirectory of hexagon/croner | Own repository (recommended) |
| --- | --- | --- |
| Package managers | vcpkg and Conan download a release tarball of the whole JS repository, and need `SOURCE_SUBDIR`-style patching | Standard layout, both expect it |
| Versioning | Tags such as `cpp-v0.1.0` next to JS tags `11.0.0`. Release tooling and GitHub "latest release" get mixed. | Independent semver (`0.x` until the API settles) |
| Issues and CI | Mixed with JS issues and CI. Path filters needed (done in `.github/workflows/cpp.yml`). | Separate |
| Consistency | | Matches `croner-rust` |
| Keeping in sync with JS | Easiest: one PR can change both | The differential test can run against a pinned npm `croner` version (`CRONER_JS=node_modules/croner/dist/croner.js`) |

To keep the history, split the subdirectory into the new repository:

```sh
git subtree split --prefix=cpp -b croner-cpp
git push git@github.com:hexagon/croner-cpp.git croner-cpp:main
```

Then move `.github/workflows/cpp.yml` along, and drop the `cpp/` prefixes. In the
differential job, install `croner` from npm and set `CRONER_JS`.

## Distribution channels

| Channel | Effort | Reach | Notes |
| --- | --- | --- | --- |
| GitHub releases + FetchContent / CPM.cmake | None beyond tagging | High among CMake users | Works the day the repository exists. The CMake package (`find_package(croner)`, target `croner::croner`) is already set up. |
| **vcpkg** (microsoft/vcpkg) | Low: `ports/croner/portfile.cmake` + `vcpkg.json`, about 20 lines for a header-only library using the existing install rules | High, especially on Windows and in CMake projects | Needs a tagged release tarball. Accepts 0.x versions. Review usually takes days. |
| **Conan Center** (conan-io/conan-center-index) | Medium: `recipes/croner/all/conanfile.py` + `test_package`, plus compiler and C++17 checks per CCI conventions | High in enterprise and embedded | `cpp/conanfile.py` works locally (`conan create`) and is a starting point. Its stricter review and hooks can take weeks. |
| Meson WrapDB | Low | Small | Only if Meson users ask for it |
| xmake-repo, build2/cppget.org, Spack | Low each | Small | Only on demand |
| Single-header amalgamation | Low (concatenate the five headers in a release workflow) | Copy-paste users, embedded | Optional release asset |
| Debian, Fedora, Homebrew | Done by distribution packagers | | Header-only libraries are rarely packaged before they are in vcpkg or Conan |

Existing C++ cron libraries include `croncpp`, which is in both vcpkg and Conan Center. Croner's
differentiators are OCPS compliance (`L`, `W`, `#`, year field, `+`), DST handling defined and
shared with croner-rust and croner.js, IANA time zones with no dependencies, and a built-in
scheduler with overrun protection.

## Checklist before 1.0 and the package manager submissions

- [ ] CI green on Linux (GCC, Clang), macOS and Windows (MSVC C++20). The Windows path,
      `std::chrono::tzdb` and `localtime_s`, has only been tested with libstdc++'s tzdb so far.
- [ ] Decide on API names that are hard to change later: `croner::Cron`, `croner::Options`,
      snake_case methods, and `croner::TimePoint` with millisecond precision.
- [ ] Decide whether job functions keep running on a thread per run, or whether to offer a
      pluggable executor, for example to run on an existing event loop or thread pool.
- [ ] Generated API docs (Doxygen), or a docs page on croner.56k.guru.
- [ ] `CHANGELOG.md`, and a statement of which croner.js version and OCPS version the port
      tracks (currently croner.js 11.0.0, OCPS 1.4 with the documented DST deviation).
