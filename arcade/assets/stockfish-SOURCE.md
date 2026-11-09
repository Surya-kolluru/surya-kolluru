# Corresponding source — Stockfish.js 10.0.2

This arcade distributes the unmodified stockfish.js 10.0.2 browser worker build in `stockfish.wasm.js` and `stockfish.wasm` under GNU GPL version 3.0. The following source repositories provide the corresponding engine and wrapper source, build scripts and notices:

- **Wrapper source at npm's pinned `gitHead`:** [niklasf/stockfish.js, commit e105072e84cf8ee5dd5219e2c5be29c3b8bf8a5a](https://github.com/niklasf/stockfish.js/tree/e105072e84cf8ee5dd5219e2c5be29c3b8bf8a5a) · [download source archive](https://codeload.github.com/niklasf/stockfish.js/tar.gz/e105072e84cf8ee5dd5219e2c5be29c3b8bf8a5a).
- **Stockfish 10 upstream source:** [official Stockfish `sf_10` tag](https://github.com/official-stockfish/Stockfish/tree/sf_10) · [download source archive](https://codeload.github.com/official-stockfish/Stockfish/tar.gz/refs/tags/sf_10).
- **GPL-3.0 license:** included locally as `stockfish-COPYING.txt`.

The worker build is the npm release's WebAssembly variant; the upstream wrapper source includes its Emscripten build process and patches. The arcade itself adds no patch to the engine binary. This source information is provided with the distributed files so recipients can obtain the engine source corresponding to the shipped build without depending on a future branch state.
