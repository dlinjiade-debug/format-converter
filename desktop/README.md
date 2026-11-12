# Desktop shell integration

The Electron entry point is `desktop/main.cjs`; the sandboxed preload is `desktop/preload.cjs`. The desktop and public website share the same conversion code; `index.html` continues to work without Electron.

## Renderer contract

Only the trusted main frame receives the frozen `window.desktopBridge`. All methods return promises; validation, permission, and filesystem failures reject. No IPC object, Node API, arbitrary path reader, directory setter, or upload endpoint is exposed.

| Method | Result / behavior |
| --- | --- |
| `getSettings()` | `{paths: {input: string, output: string, reference: string}}`; unset paths are `''`. |
| `chooseDirectory(kind)` | Native chooser for `input`, `output`, or `reference`; returns the same settings shape. Cancellation leaves settings and tokens unchanged. There is no renderer-supplied directory argument. |
| `listFiles(kind)` | Only `input` or `reference`; returns direct regular files as `[{id, name, size}]`. An unset directory returns `[]`. Subdirectories and symlinks/junctions are excluded. |
| `readFile(id)` | `{name, bytes: Uint8Array}`. IDs are random, process-local capabilities issued by listing; paths are not accepted. |
| `saveResult({name, bytes})` | `bytes` must be `Uint8Array`; returns `{path}` or `{path: '', cancelled: true}`. No other payload keys are accepted. |

Typical handoff to the shared browser converter:

```js
const files = await window.desktopBridge.listFiles('input');
const source = await window.desktopBridge.readFile(files[0].id);
const file = new File([source.bytes], source.name);
// Pass `file` through the existing in-browser conversion flow.
await window.desktopBridge.saveResult({ name: 'result.pdf', bytes: new Uint8Array(await resultBlob.arrayBuffer()) });
```

Changing any authorized directory revokes all file IDs. Re-listing revokes that kind's previous generation. Modified/replaced files must be listed again. Selecting the same unchanged directory or cancelling does not revoke IDs.

Configured output saves use exclusive `wx` creation with `name (1).ext`, `name (2).ext`, etc. Existing files, directories, and symlinks are never overwritten. Without configured output, a native save dialog authorizes a single destination; an existing destination is rejected even if the native overwrite confirmation was accepted. The output preference is not changed by that dialog. Chromium downloads are disabled, so the UI must route desktop result downloads through this bridge.

## Storage and security

`createSettingsStore({userDataPath, chooseDirectory, chooseSavePath})` in `settings-store.cjs` provides the same five methods without Electron. Injected chooser callbacks return an absolute native-selected path or `null`/`undefined` on cancellation. This is a main-process/test interface, never a renderer API.

Settings are saved in `app.getPath('userData')/desktop-settings.json` as `{version: 1, paths}`. Writes use an exclusively created sibling temporary file, fsync, and atomic rename; failed persistence does not change in-memory authorization. Corrupt settings fail startup closed and are not silently replaced. A saved directory that is unavailable/unsafe at startup remains displayed but cannot be accessed until selected again.

The asset server binds only `127.0.0.1` on port `0`. A startup allowlist exposes `/`, `/index.html`, and regular JS/WASM/CSS/JSON/image/font assets under `lib/`. It has no directory indexes, conversion routes, arbitrary filesystem routes, or uploads. Only GET/HEAD are accepted; Host/Origin checks, traversal rejection, no-store, nosniff, COOP/COEP/CORP, and CSP are applied. All asset contents use Electron's ASAR-aware filesystem APIs. Ordinary assets are checked by inode; ASAR virtual entries use entry sizes plus the physical archive's identity from `original-fs` (metadata only), because even lstat(app.asar) is a synthetic directory with per-call virtual inodes.

Each launch uses a private nonpersistent browser session with a direct proxy policy. Renderer requests are blocked except the exact app HTTP origin and blob/data URLs. External navigation, new windows, webviews, permissions, and native Chromium downloads are denied. No `shell.openExternal` bridge is provided: external links are intentionally disabled. IPC checks both the originating WebContents and exact live main frame's origin before dispatching to the store.

## Verification and known limits

```powershell
node --test tests/desktop.test.cjs
npm run test:desktop
npm run build:desktop
npm run test:packaged
```

Unit tests use disposable OS temp directories without launching Electron. Native end-to-end tests launch hidden windows, stub only the native chooser answers, and exercise real IPC, directory persistence, conversion, preview, saving and collision-safe output. Packaged tests repeat the workflow from app.asar and separately launch the portable EXE. They do not claim manual Office/WPS visual equivalence.

Before starting Electron, `FORMAT_CONVERTER_TEST_DATA` can override `userData` with an absolute temporary directory. `FORMAT_CONVERTER_TEST_HIDDEN=1` leaves the window hidden and suppresses startup error dialogs. Neither variable authorizes input/output/reference paths.

Bridge reads/results are buffered and limited to 512 MiB each. Filenames are limited to 240 UTF-8 bytes / 240 UTF-16 code units; path separators, dot-segment names, Windows device names/ADS, forbidden punctuation, control characters, and trailing whitespace/dots are rejected. Collision suffixes must also fit that limit (at most 9,999 suffixes). Large media streaming, recursive listing, directory clearing, and overwrite approval are not implemented.

Directory ancestors and file identity are rechecked, and reads use `O_NOFOLLOW` where the OS supports it. Portable Node APIs cannot provide fully race-free Windows directory-relative operations against a malicious local process concurrently replacing ancestors. Do not treat this as an OS filesystem sandbox. The application bundle and userData remain trusted local installation/profile data.

On Windows without Developer Mode/admin privileges the file-symlink test is explicitly skipped; junction escape/replacement tests still run. No visible application is launched during these tests.
