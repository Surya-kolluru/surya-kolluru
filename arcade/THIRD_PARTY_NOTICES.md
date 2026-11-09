# Third-party notices

## chess.js 1.4.0

The chess rules implementation is from [chess.js](https://github.com/jhlywa/chess.js), pinned to version 1.4.0. The local ES module is `js/chess-rules.js`.

Copyright (c) 2025, Jeff Hlywa. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## Stockfish.js 10.0.2 (WebAssembly)

The optional local chess-computer engine is based on [stockfish.js 10.0.2](https://www.npmjs.com/package/stockfish.js), compiled from Stockfish for a browser Web Worker. The runtime assets are `assets/stockfish.wasm.js` and `assets/stockfish.wasm`; its license text is included as `assets/stockfish-COPYING.txt`. The engine is only initialized when a user selects Play Computer.

Stockfish and this distribution are licensed under GNU GPL version 3. The complete GPLv3 text is included with this release. Corresponding source and build information are identified in [`assets/stockfish-SOURCE.md`](./assets/stockfish-SOURCE.md): the wrapper repository is pinned to npm's `gitHead` commit `e105072e84cf8ee5dd5219e2c5be29c3b8bf8a5a`, and the original engine source is pinned to Stockfish's `sf_10` tag. Both repositories expose source archives and build instructions. The package's JavaScript worker runtime is itself provided in source form. The application does not modify the Stockfish binary.

This distribution includes no Syzygy tablebases. Search strength settings are product difficulty presets only and do not claim a measured Elo.
