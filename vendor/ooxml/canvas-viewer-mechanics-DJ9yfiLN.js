import { on as e } from "./line-metrics-A77J_KRx.js";
//#region packages/core/src/errors/cfb-sniff.ts
var t = [
	208,
	207,
	17,
	224,
	161,
	177,
	26,
	225
], n = 4294967290, r = 512, i = 128, a = 4096, o = 8192, s = new Set([
	"WordDocument",
	"Workbook",
	"Book",
	"PowerPoint Document"
]), c = "EncryptionInfo";
function l(e) {
	if (e.length < r) return null;
	for (let n = 0; n < t.length; n++) if (e[n] !== t[n]) return null;
	let n = new DataView(e.buffer, e.byteOffset, e.byteLength), i = n.getUint16(30, !0);
	if (i !== 9 && i !== 12) return "cfb-unknown";
	let a = 1 << i, o = n.getUint32(48, !0), l = u(n, e.length, a, o);
	if (l === null) return "cfb-unknown";
	if (l.has(c)) return "encrypted";
	for (let e of l) if (s.has(e)) return "legacy-binary-format";
	return "cfb-unknown";
}
function u(e, t, n, r) {
	if (!m(r)) return null;
	let s = /* @__PURE__ */ new Set(), c = Math.floor(n / i);
	if (c < 1) return null;
	let l = /* @__PURE__ */ new Set(), u = r, h = 0, g = 0;
	for (; m(u) && !(h++ > o || l.has(u));) {
		l.add(u);
		let r = p(u, n);
		if (r < 0 || r + n > t) return null;
		for (let t = 0; t < c; t++) {
			if (g++ > a) return s;
			let n = d(e, r + t * i);
			n && s.add(n);
		}
		let o = f(e, t, n, u);
		if (o === null) break;
		u = o;
	}
	return s;
}
function d(e, t) {
	let n = e.getUint16(t + 64, !0);
	if (n < 2 || n > 64) return "";
	let r = n / 2 - 1, i = "";
	for (let n = 0; n < r; n++) {
		let r = e.getUint16(t + n * 2, !0);
		if (r === 0) break;
		i += String.fromCharCode(r);
	}
	return i;
}
function f(e, t, n, r) {
	let i = Math.floor(n / 4);
	if (i < 1) return null;
	let a = Math.floor(r / i), o = r % i;
	if (a >= 109) return null;
	let s = 76 + a * 4;
	if (s + 4 > t) return null;
	let c = e.getUint32(s, !0);
	if (!m(c)) return null;
	let l = p(c, n), u = l + o * 4;
	return l < 0 || u + 4 > t ? null : e.getUint32(u, !0);
}
function p(e, t) {
	return (e + 1) * t;
}
function m(e) {
	return e >= 0 && e <= n;
}
//#endregion
//#region packages/core/src/errors/cfb-read.ts
var h = [
	208,
	207,
	17,
	224,
	161,
	177,
	26,
	225
], g = 4294967290, _ = 4294967294, ee = 512, v = 128, y = 4e6, te = 8e6, b = 65536, ne = 1e6;
function x(e, t) {
	if (e.length < ee) return null;
	for (let t = 0; t < h.length; t++) if (e[t] !== h[t]) return null;
	let n = new DataView(e.buffer, e.byteOffset, e.byteLength), r = re(n);
	if (r === null) return null;
	let i = w(n, e.length, r);
	if (i === null) return null;
	let a = ie(n, e.length, r, i, t);
	if (a === null || a.target === null) return null;
	let { target: o, root: s } = a;
	return o.size === 0 ? new Uint8Array() : o.size < r.miniStreamCutoff ? s === null ? null : oe(n, e.length, r, i, s, o) : E(n, e.length, r, i, o.startSector, o.size);
}
function re(e) {
	let t = e.getUint16(30, !0);
	if (t !== 9 && t !== 12) return null;
	let n = e.getUint16(32, !0);
	return n === 6 ? {
		sectorSize: 1 << t,
		miniSectorSize: 1 << n,
		miniStreamCutoff: e.getUint32(56, !0),
		firstDirSector: e.getUint32(48, !0),
		firstMiniFatSector: e.getUint32(60, !0),
		firstDifatSector: e.getUint32(68, !0),
		numDifatSectors: e.getUint32(72, !0)
	} : null;
}
function S(e, t) {
	return (e + 1) * t;
}
function C(e) {
	return e >= 0 && e <= g;
}
function w(e, t, n) {
	let { sectorSize: r } = n, i = [];
	for (let t = 0; t < 109; t++) {
		let n = e.getUint32(76 + t * 4, !0);
		C(n) && i.push(n);
	}
	let a = r / 4 - 1, o = n.firstDifatSector, s = /* @__PURE__ */ new Set(), c = 0;
	for (; C(o);) {
		if (c++ > ne) return null;
		if (s.has(o)) break;
		s.add(o);
		let n = S(o, r);
		if (n < 0 || n + r > t) return null;
		for (let t = 0; t < a; t++) {
			let r = e.getUint32(n + t * 4, !0);
			C(r) && i.push(r);
		}
		o = e.getUint32(n + a * 4, !0);
	}
	return i;
}
function T(e, t, n, r, i) {
	let a = n / 4, o = Math.floor(i / a), s = i % a;
	if (o >= r.length) return null;
	let c = r[o];
	if (!C(c)) return null;
	let l = S(c, n) + s * 4;
	return l < 0 || l + 4 > t ? null : e.getUint32(l, !0);
}
function ie(e, t, n, r, i) {
	let { sectorSize: a } = n, o = Math.floor(a / v);
	if (o < 1) return null;
	let s = null, c = null, l = /* @__PURE__ */ new Set(), u = n.firstDirSector, d = 0, f = 0;
	for (; C(u);) {
		if (d++ > y) return null;
		if (l.has(u)) break;
		l.add(u);
		let n = S(u, a);
		if (n < 0 || n + a > t) return null;
		for (let t = 0; t < o; t++) {
			if (f++ > b) return {
				target: s,
				root: c
			};
			let r = n + t * v, a = e.getUint8(r + 66);
			if (a === 0) continue;
			let o = e.getUint32(r + 116, !0), l = e.getUint32(r + 120, !0);
			if (a === 5) {
				c = {
					startSector: o,
					size: l
				};
				continue;
			}
			ae(e, r) === i && (s = {
				startSector: o,
				size: l
			});
		}
		let p = T(e, t, a, r, u);
		if (p === null) break;
		u = p;
	}
	return {
		target: s,
		root: c
	};
}
function ae(e, t) {
	let n = e.getUint16(t + 64, !0);
	if (n < 2 || n > 64) return "";
	let r = n / 2 - 1, i = "";
	for (let n = 0; n < r; n++) {
		let r = e.getUint16(t + n * 2, !0);
		if (r === 0) break;
		i += String.fromCharCode(r);
	}
	return i;
}
function E(e, t, n, r, i, a) {
	let { sectorSize: o } = n, s = new Uint8Array(a), c = 0, l = i, u = /* @__PURE__ */ new Set(), d = 0;
	for (; C(l) && c < a;) {
		if (d++ > y || u.has(l)) return null;
		u.add(l);
		let n = S(l, o);
		if (n < 0 || n + o > t) return null;
		let i = Math.min(o, a - c);
		s.set(new Uint8Array(e.buffer, e.byteOffset + n, i), c), c += i;
		let f = T(e, t, o, r, l);
		if (f === null) return null;
		l = f;
	}
	return c === a ? s : null;
}
function oe(e, t, n, r, i, a) {
	let { sectorSize: o, miniSectorSize: s } = n, c = E(e, t, n, r, i.startSector, i.size);
	if (c === null) return null;
	let l = new Uint8Array(a.size), u = 0, d = a.startSector, f = /* @__PURE__ */ new Set(), p = 0, m = o / 4;
	for (; C(d) && u < a.size;) {
		if (p++ > te || f.has(d)) return null;
		f.add(d);
		let i = d * s;
		if (i < 0 || i + s > c.length) return null;
		let o = Math.min(s, a.size - u);
		l.set(c.subarray(i, i + o), u), u += o;
		let h = se(e, t, n, r, m, d);
		if (h === null) return null;
		d = h;
	}
	return u === a.size ? l : null;
}
function se(e, t, n, r, i, a) {
	let { sectorSize: o } = n, s = Math.floor(a / i), c = a % i, l = n.firstMiniFatSector, u = /* @__PURE__ */ new Set();
	for (let n = 0; n < s; n++) {
		if (!C(l) || u.has(l)) return null;
		u.add(l);
		let n = T(e, t, o, r, l);
		if (n === null) return null;
		l = n;
	}
	if (!C(l)) return null;
	let d = S(l, o) + c * 4;
	if (d < 0 || d + 4 > t) return null;
	let f = e.getUint32(d, !0);
	return f === _ ? _ : f;
}
//#endregion
//#region packages/core/src/crypto/encryption-info.ts
function D(e) {
	if (typeof atob == "function") {
		let t = atob(e), n = new Uint8Array(t.length);
		for (let e = 0; e < t.length; e++) n[e] = t.charCodeAt(e);
		return n;
	}
	let t = globalThis.Buffer;
	if (t) return new Uint8Array(t.from(e, "base64"));
	throw Error("no base64 decoder available");
}
function O(e, t, n) {
	let r = RegExp(`<(?:[\\w]+:)?${t}\\b[^>]*>`).exec(e);
	if (!r) return null;
	let i = r[0], a = RegExp(`\\b${n}\\s*=\\s*"([^"]*)"`).exec(i);
	return a ? a[1] : null;
}
function k(e) {
	if (e === null) return null;
	let t = Number(e);
	return Number.isFinite(t) ? t : null;
}
function A(e, t) {
	let n = k(O(e, t, "saltSize")), r = k(O(e, t, "blockSize")), i = k(O(e, t, "keyBits")), a = k(O(e, t, "hashSize")), o = O(e, t, "cipherAlgorithm"), s = O(e, t, "cipherChaining"), c = O(e, t, "hashAlgorithm"), l = O(e, t, "saltValue");
	return n === null || r === null || i === null || a === null || !o || !s || !c || l === null ? null : {
		saltSize: n,
		blockSize: r,
		keyBits: i,
		hashSize: a,
		cipherAlgorithm: o,
		cipherChaining: s,
		hashAlgorithm: c,
		saltValue: D(l)
	};
}
function j(e) {
	if (e.length < 8) return { kind: "unknown" };
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = t.getUint16(0, !0), r = t.getUint16(2, !0);
	if (n === 4 && r === 4) {
		let t = M(e.subarray(8));
		return t ? {
			kind: "agile",
			descriptor: t
		} : { kind: "unknown" };
	}
	return r === 16 && (n === 3 || n === 4) ? { kind: "extensible" } : r === 2 && (n === 2 || n === 3 || n === 4) ? { kind: "standard" } : { kind: "unknown" };
}
function M(e) {
	let t = new TextDecoder("utf-8").decode(e), n = A(t, "keyData"), r = A(t, "encryptedKey");
	if (!n || !r) return null;
	let i = k(O(t, "encryptedKey", "spinCount")), a = O(t, "encryptedKey", "encryptedVerifierHashInput"), o = O(t, "encryptedKey", "encryptedVerifierHashValue"), s = O(t, "encryptedKey", "encryptedKeyValue");
	if (i === null || a === null || o === null || s === null) return null;
	let c = {
		...r,
		spinCount: i,
		encryptedVerifierHashInput: D(a),
		encryptedVerifierHashValue: D(o),
		encryptedKeyValue: D(s)
	}, l = null, u = O(t, "dataIntegrity", "encryptedHmacKey"), d = O(t, "dataIntegrity", "encryptedHmacValue");
	return u !== null && d !== null && (l = {
		encryptedHmacKey: D(u),
		encryptedHmacValue: D(d)
	}), {
		keyData: n,
		passwordKeyEncryptor: c,
		dataIntegrity: l
	};
}
//#endregion
//#region packages/core/src/crypto/agile.ts
var N = {
	verifierHashInput: new Uint8Array([
		254,
		167,
		210,
		118,
		59,
		75,
		158,
		121
	]),
	verifierHashValue: new Uint8Array([
		215,
		170,
		15,
		109,
		48,
		97,
		52,
		78
	]),
	keyValue: new Uint8Array([
		20,
		110,
		11,
		231,
		171,
		172,
		208,
		214
	]),
	hmacKey: new Uint8Array([
		95,
		178,
		173,
		1,
		12,
		185,
		225,
		246
	]),
	hmacValue: new Uint8Array([
		160,
		103,
		127,
		2,
		178,
		44,
		132,
		51
	])
}, ce = 54, P = 4096, F = class extends Error {
	reason;
	constructor(e, t) {
		super(t), this.name = "AgileDecryptError", this.reason = e;
	}
};
function I() {
	let e = globalThis.crypto;
	if (!e || !e.subtle) throw new F("unsupported-encryption", "WebCrypto (globalThis.crypto.subtle) is unavailable; cannot decrypt.");
	return e.subtle;
}
function L(e) {
	switch (e.toUpperCase().replace(/[-_]/g, "")) {
		case "SHA512": return "SHA-512";
		case "SHA384": return "SHA-384";
		case "SHA256": return "SHA-256";
		case "SHA1": return "SHA-1";
		default: throw new F("unsupported-encryption", `Unsupported hashAlgorithm "${e}" (only SHA-1/256/384/512).`);
	}
}
function R(e) {
	if (e.cipherAlgorithm.toUpperCase() !== "AES") throw new F("unsupported-encryption", `Unsupported cipherAlgorithm "${e.cipherAlgorithm}" (only AES).`);
	if (e.cipherChaining.toLowerCase() !== "chainingmodecbc") throw new F("unsupported-encryption", `Unsupported cipherChaining "${e.cipherChaining}" (only ChainingModeCBC).`);
	if (e.keyBits !== 128 && e.keyBits !== 192 && e.keyBits !== 256) throw new F("unsupported-encryption", `Unsupported keyBits ${e.keyBits} (only 128/192/256).`);
}
function z(...e) {
	let t = e.reduce((e, t) => e + t.length, 0), n = new Uint8Array(t), r = 0;
	for (let t of e) n.set(t, r), r += t.length;
	return n;
}
function B(e) {
	let t = new Uint8Array(4);
	return new DataView(t.buffer).setUint32(0, e >>> 0, !0), t;
}
function le(e) {
	let t = new Uint8Array(e.length * 2), n = new DataView(t.buffer);
	for (let t = 0; t < e.length; t++) n.setUint16(t * 2, e.charCodeAt(t), !0);
	return t;
}
async function V(e, t) {
	return new Uint8Array(await I().digest(e, t));
}
function H(e, t) {
	if (e.length > t) return e.slice(0, t);
	let n = new Uint8Array(t);
	return n.set(e), e.length < t && n.fill(ce, e.length), n;
}
async function U(e, t, n, r) {
	let i = L(t.hashAlgorithm), a = await V(i, z(t.saltValue, le(e)));
	for (let e = 0; e < n; e++) a = await V(i, z(B(e), a));
	return H(await V(i, z(a, r)), t.keyBits / 8);
}
async function W(e, t, n) {
	return H(n ? await V(L(e.hashAlgorithm), z(t, n)) : t, e.blockSize);
}
async function G(e, t, n) {
	let r = t.length;
	if (n.length === 0) return new Uint8Array();
	if (n.length % r !== 0) throw new F("corrupt", "ciphertext length is not a multiple of the block size");
	let i = await I().importKey("raw", e, { name: "AES-CBC" }, !1, ["decrypt"]), a = await I().importKey("raw", e, { name: "AES-CBC" }, !1, ["encrypt"]), o = n.subarray(n.length - r), s = ue(new Uint8Array(r).fill(r), o), c = z(n, new Uint8Array(await I().encrypt({
		name: "AES-CBC",
		iv: new Uint8Array(r)
	}, a, s)).subarray(0, r)), l = new Uint8Array(await I().decrypt({
		name: "AES-CBC",
		iv: t
	}, i, c));
	return l.length >= n.length ? l.subarray(0, n.length) : l;
}
function ue(e, t) {
	let n = new Uint8Array(e.length);
	for (let r = 0; r < e.length; r++) n[r] = e[r] ^ t[r];
	return n;
}
async function de(e, t) {
	R(t);
	let n = L(t.hashAlgorithm), r = await G(await U(e, t, t.spinCount, N.verifierHashInput), await W(t, t.saltValue, null), t.encryptedVerifierHashInput), i = await G(await U(e, t, t.spinCount, N.verifierHashValue), await W(t, t.saltValue, null), t.encryptedVerifierHashValue);
	return fe((await V(n, r)).subarray(0, t.hashSize), i.subarray(0, t.hashSize));
}
function fe(e, t) {
	if (e.length !== t.length) return !1;
	let n = 0;
	for (let r = 0; r < e.length; r++) n |= e[r] ^ t[r];
	return n === 0;
}
async function pe(e, t) {
	return await G(await U(e, t, t.spinCount, N.keyValue), await W(t, t.saltValue, null), t.encryptedKeyValue);
}
async function me(e, t, n) {
	if (R(t), e.length < 8) throw new F("corrupt", "EncryptedPackage is shorter than its size prefix");
	let r = new DataView(e.buffer, e.byteOffset, e.byteLength), i = Number(r.getBigUint64(0, !0)), a = e.subarray(8);
	if (i > a.length) throw new F("corrupt", "EncryptedPackage size prefix exceeds the ciphertext");
	let o = n.slice(0, t.keyBits / 8), s = new Uint8Array(i), c = 0, l = 0;
	for (let e = 0; e < a.length; e += P) {
		let n = a.subarray(e, e + P), r = await G(o, await W(t, t.saltValue, B(l)), n), u = Math.min(r.length, i - c);
		if (s.set(r.subarray(0, u), c), c += u, l++, c >= i) break;
	}
	if (c !== i) throw new F("corrupt", "decrypted output is shorter than the declared size");
	return s;
}
async function he(e, t, n) {
	let { keyData: r, passwordKeyEncryptor: i } = e;
	if (R(r), R(i), !await de(n, i)) throw new F("invalid-password", "The supplied password is incorrect.");
	return me(t, r, await pe(n, i));
}
//#endregion
//#region packages/core/src/crypto/decrypt-ooxml.ts
var ge = "EncryptionInfo", _e = "EncryptedPackage";
async function ve(e, t) {
	let n = x(e, ge), r = x(e, _e);
	if (n === null || r === null) return {
		ok: !1,
		reason: "corrupt"
	};
	let i = j(n);
	if (i.kind !== "agile") return {
		ok: !1,
		reason: "unsupported-encryption"
	};
	try {
		return {
			ok: !0,
			data: await he(i.descriptor, r, t)
		};
	} catch (e) {
		return e instanceof F ? {
			ok: !1,
			reason: e.reason
		} : {
			ok: !1,
			reason: "corrupt"
		};
	}
}
//#endregion
//#region packages/core/src/errors/cfb-guard.ts
function ye(t) {
	let n = l(t instanceof Uint8Array ? t : new Uint8Array(t));
	if (n !== null) switch (n) {
		case "encrypted": throw new e("encrypted", "This file is password-protected (MS-OFFCRYPTO). Pass LoadOptions.password to decrypt it.");
		case "legacy-binary-format": throw new e("legacy-binary-format", "This is a legacy binary Office file (.doc/.xls/.ppt), not OOXML.");
		case "cfb-unknown": throw new e("not-ooxml", "This file is an OLE2/Compound File container, not an OOXML (ZIP) document.");
		default: throw new e("not-ooxml", "This file is an OLE2/Compound File container of an unrecognised kind, not an OOXML (ZIP) document.");
	}
}
async function be(t, n) {
	let r = t instanceof Uint8Array ? t : new Uint8Array(t), i = l(r);
	if (i === null) return r;
	if (i === "encrypted") {
		if (n === void 0) throw new e("encrypted", "This file is password-protected (MS-OFFCRYPTO). Pass LoadOptions.password to decrypt it.");
		let t = await ve(r, n);
		if (t.ok) return t.data;
		switch (t.reason) {
			case "invalid-password": throw new e("invalid-password", "The supplied password is incorrect.");
			case "unsupported-encryption": throw new e("unsupported-encryption", "This file uses an encryption scheme other than Agile ([MS-OFFCRYPTO]) that is not supported (Standard / Extensible / legacy binary encryption).");
			case "corrupt": throw new e("not-ooxml", "This file is an encrypted OLE2/Compound File container but its structure could not be read.");
			default: throw t.reason, new e("not-ooxml", "This encrypted file could not be decrypted.");
		}
	}
	return ye(r), r;
}
function xe(e) {
	return e.byteOffset === 0 && e.byteLength === e.buffer.byteLength && e.buffer instanceof ArrayBuffer ? e.buffer : e.slice().buffer;
}
//#endregion
//#region packages/core/src/autoResize.ts
function Se(e, t, n = {}) {
	let r = n.pauseWhenHidden ?? !0, i = null, a = 0, o = 0, s = null, c = !1, l = !1, u = () => {
		if (!l && !(r && typeof document < "u" && document.hidden)) {
			if (s) {
				c = !0;
				return;
			}
			i === null && (i = requestAnimationFrame(d));
		}
	}, d = async () => {
		if (i = null, l) return;
		let t = a, n = o;
		try {
			let r = e(t, n);
			s = r instanceof Promise ? r : Promise.resolve(), await s;
		} catch (e) {
			console.error("[autoResize] render failed:", e);
		} finally {
			s = null, c && !l && (c = !1, u());
		}
	}, f = new ResizeObserver((e) => {
		for (let t of e) {
			let e = t.contentRect;
			a = e.width, o = e.height;
		}
		u();
	});
	f.observe(t);
	let p = () => {
		typeof document < "u" && !document.hidden && u();
	};
	return r && typeof document < "u" && document.addEventListener("visibilitychange", p), () => {
		l = !0, f.disconnect(), i !== null && (cancelAnimationFrame(i), i = null), r && typeof document < "u" && document.removeEventListener("visibilitychange", p);
	};
}
//#endregion
//#region packages/core/src/worker/bridge.ts
function K() {
	let e = /* @__PURE__ */ Error("worker request aborted");
	return e.name = "AbortError", e;
}
var Ce = class {
	_worker;
	_opts;
	_pending = /* @__PURE__ */ new Map();
	_orphaned = /* @__PURE__ */ new Map();
	_nextId = 1;
	_terminated = !1;
	_failure;
	constructor(e, t) {
		this._worker = e, this._opts = t, this._worker.addEventListener("message", this._handle), this._worker.addEventListener("messageerror", this._handleWorkerError), this._worker.addEventListener("error", this._handleWorkerError);
	}
	_handle = (e) => {
		let t = e.data, n = this._opts.correlate(t);
		if (n === void 0) {
			this._opts.onUnsolicited?.(t);
			return;
		}
		let r = this._pending.get(n);
		if (!r) {
			try {
				let e = this._orphaned.get(n);
				e ? (this._orphaned.delete(n), e(t)) : this._opts.onOrphanedResponse?.(t);
			} catch {}
			return;
		}
		this._pending.delete(n), r.cleanup();
		let i = this._opts.toError?.(t);
		i === void 0 ? r.resolve(t) : r.reject(i instanceof Error ? i : Error(i));
	};
	_handleWorkerError = (e) => {
		let t = "message" in e && e.message ? `: ${e.message}` : "";
		this._failure ??= /* @__PURE__ */ Error(`Worker error${t}`), this._rejectAll(this._failure);
	};
	_rejectAll(e) {
		let t = [...this._pending.values()];
		this._pending.clear();
		for (let n of t) n.cleanup(), n.reject(e);
	}
	nextId() {
		return this._nextId++;
	}
	request(e, t, n) {
		let r = this._nextId++, i = n?.timeoutMs === !1 ? void 0 : n?.timeoutMs ?? this._opts.timeoutMs, a = n?.signal, o = (e) => {
			try {
				n?.onCancel?.(r, e);
			} catch {}
		};
		return new Promise((s, c) => {
			if (this._terminated) {
				c(/* @__PURE__ */ Error("Worker terminated"));
				return;
			}
			if (this._failure) {
				c(this._failure);
				return;
			}
			if (a?.aborted) {
				o("abort"), c(K());
				return;
			}
			let l, u;
			this._pending.set(r, {
				resolve: s,
				reject: c,
				cleanup: () => {
					l !== void 0 && (clearTimeout(l), l = void 0), u && a && (a.removeEventListener("abort", u), u = void 0);
				},
				onOrphanedResponse: n?.onOrphanedResponse
			}), i !== void 0 && (l = setTimeout(() => {
				let e = this._pending.get(r);
				e && (this._pending.delete(r), e.onOrphanedResponse && this._orphaned.set(r, e.onOrphanedResponse), e.cleanup(), o("timeout"), e.reject(/* @__PURE__ */ Error(`worker request timed out after ${i}ms`)));
			}, i)), a && (u = () => {
				let e = this._pending.get(r);
				e && (this._pending.delete(r), e.onOrphanedResponse && this._orphaned.set(r, e.onOrphanedResponse), e.cleanup(), o("abort"), e.reject(K()));
			}, a.addEventListener("abort", u));
			try {
				this._worker.postMessage(e(r), t);
			} catch (e) {
				let t = this._pending.get(r);
				if (!t) return;
				this._pending.delete(r), t.cleanup(), t.reject(e instanceof Error ? e : Error(String(e)));
			}
		});
	}
	transport(e) {
		return {
			request: (t, n, r) => this.request(t, n, {
				...r,
				onOrphanedResponse: r?.onOrphanedResponse ? (t) => {
					e(t) && r.onOrphanedResponse?.(t);
				} : void 0
			}).then((t) => {
				if (!e(t)) throw Error("worker response does not match the selected transport");
				return t;
			}),
			forgetOrphaned: (e) => this.forgetOrphaned(e),
			terminate: () => this.terminate()
		};
	}
	post(e, t) {
		this._worker.postMessage(e, t);
	}
	forgetOrphaned(e) {
		for (let t of e) this._orphaned.delete(t);
	}
	get orphanedRequestCount() {
		return this._orphaned.size;
	}
	terminate() {
		this._terminated || (this._terminated = !0, this._worker.removeEventListener("message", this._handle), this._worker.removeEventListener("messageerror", this._handleWorkerError), this._worker.removeEventListener("error", this._handleWorkerError), this._worker.terminate(), this._rejectAll(/* @__PURE__ */ Error("Worker terminated")), this._orphaned.clear());
	}
};
//#endregion
//#region packages/core/src/worker/rejected-load.ts
function we(e, t) {
	if (t) try {
		t();
		return;
	} catch {}
	try {
		e.terminate();
	} catch {}
}
//#endregion
//#region packages/core/src/interaction/zoom.ts
var Te = .01;
function Ee(e, t) {
	return e * Math.exp(-t * Te);
}
function De(e, t, n, r, i) {
	let a = n > 0 ? r / n : 1, o = (e + t) * a - t, s = i.maxScroll > 0 ? i.maxScroll : 0;
	return o < 0 ? 0 : o > s ? s : o;
}
//#endregion
//#region packages/core/src/interaction/zoomable.ts
var q = Object.freeze([
	.25,
	.33,
	.5,
	.67,
	.75,
	.9,
	1,
	1.1,
	1.25,
	1.5,
	1.75,
	2,
	2.5,
	3,
	4
]), J = .005;
function Oe(e) {
	for (let t of q) if (t > e + J) return t;
	return q[q.length - 1];
}
function ke(e) {
	for (let t = q.length - 1; t >= 0; t--) {
		let n = q[t];
		if (n < e - J) return n;
	}
	return q[0];
}
function Ae(e, t, n) {
	return e < t ? t : e > n ? n : e;
}
function je(e, t) {
	let { contentWidth: n, contentHeight: r, containerWidth: i, containerHeight: a } = e;
	if (n <= 0 || i <= 0) return 0;
	let o = i / n;
	if (t === "width") return o;
	if (r <= 0 || a <= 0) return 0;
	let s = a / r;
	return Math.min(o, s);
}
//#endregion
//#region packages/core/src/search/text-index.ts
function Y(e) {
	let t = e.toLowerCase();
	if (t.length === e.length) return t;
	let n = "";
	for (let t of e) {
		let e = t.toLowerCase();
		n += e.length === t.length ? e : t;
	}
	return n;
}
function Me(e) {
	let t = Array(e.length), n = 0, r = "";
	for (let i = 0; i < e.length; i++) t[i] = n, r += e[i].text, n += e[i].text.length;
	return {
		text: r,
		folded: Y(r),
		runStart: t,
		runCount: e.length
	};
}
function Ne(e, t) {
	let { runStart: n } = e, r = 0, i = n.length - 1;
	for (; r < i;) {
		let e = r + i + 1 >> 1;
		n[e] <= t ? r = e : i = e - 1;
	}
	return r;
}
function Pe(e, t, n) {
	let { runStart: r, runCount: i, text: a } = e, o = [], s = Ne(e, t), c = t;
	for (; c < n && s < i;) {
		let e = s + 1 < i ? r[s + 1] : a.length, t = Math.min(n, e), l = c - r[s], u = t - r[s];
		u > l && o.push({
			runIndex: s,
			start: l,
			end: u
		}), c = t, s++;
	}
	return o;
}
function Fe(e, t, n = {}) {
	if (t.length === 0) return [];
	let r = n.caseSensitive ?? !1, i = r ? e.text : e.folded, a = r ? t : Y(t), o = [], s = 0, c = 0;
	for (;;) {
		let t = i.indexOf(a, s);
		if (t === -1) break;
		o.push({
			matchIndex: c,
			slices: Pe(e, t, t + a.length)
		}), c++, s = t + a.length;
	}
	return o;
}
//#endregion
//#region packages/core/src/search/find-cursor.ts
function Ie(e, t) {
	return t <= 0 ? -1 : e < 0 ? 0 : (e + 1) % t;
}
function Le(e, t) {
	return t <= 0 ? -1 : e < 0 ? t - 1 : (e - 1 + t) % t;
}
//#endregion
//#region packages/core/src/internal/chart-context.ts
var X = 65536;
function Re(e, t) {
	let n = Math.min(e.length, t);
	if (n > 0 && n < e.length) {
		let t = e.charCodeAt(n - 1), r = e.charCodeAt(n);
		t >= 55296 && t <= 56319 && r >= 56320 && r <= 57343 && n--;
	}
	return e.slice(0, n);
}
function ze(e) {
	let t = e ?? 16384;
	if (!Number.isFinite(t) || t < 0) throw RangeError("maxTextCharacters must be a finite non-negative number.");
	return Math.min(X, Math.floor(t));
}
function Be(e, t) {
	let n = ze(t), r = [], i = 0, a = !1, o = !1, s = (e, t) => {
		if (t && o) {
			if (i >= n) return a = !0, !1;
			r.push("\n"), i++;
		}
		o = !0;
		let s = Re(e, Math.max(0, n - i));
		return r.push(s), i += s.length, s.length < e.length ? (a = !0, !1) : !0;
	};
	if (!s(`Chart type: ${e.chartType}`, !0) || e.title !== null && !s(`Title: ${e.title}`, !0)) return {
		text: r.join(""),
		truncated: a,
		textCharacters: i,
		maxTextCharacters: n
	};
	if (e.categories.length > 0) {
		if (!s("Categories: ", !0)) return {
			text: r.join(""),
			truncated: a,
			textCharacters: i,
			maxTextCharacters: n
		};
		for (let [t, o] of e.categories.entries()) if (!s(`${t === 0 ? "" : ", "}${o}`, !1)) return {
			text: r.join(""),
			truncated: a,
			textCharacters: i,
			maxTextCharacters: n
		};
	}
	for (let t of e.series) {
		if (!s(`Series ${t.name || "(unnamed)"}: `, !0)) break;
		for (let [e, o] of t.values.entries()) if (!s(`${e === 0 ? "" : ", "}${o === null ? "" : o}`, !1)) return {
			text: r.join(""),
			truncated: a,
			textCharacters: i,
			maxTextCharacters: n
		};
		if (a) break;
	}
	return {
		text: r.join(""),
		truncated: a,
		textCharacters: i,
		maxTextCharacters: n
	};
}
//#endregion
//#region packages/core/src/internal/canvas-viewer-mechanics.ts
var Ve = 65536, He = 1024;
function Z(e, t, n) {
	let r = e ?? t;
	if (!Number.isFinite(r) || r < 0) throw RangeError(`${n} must be a finite non-negative number.`);
	return Math.min(t, Math.floor(r));
}
function Q(e, t) {
	let n = Math.min(e.length, t);
	if (n > 0 && n < e.length) {
		let t = e.charCodeAt(n - 1), r = e.charCodeAt(n);
		t >= 55296 && t <= 56319 && r >= 56320 && r <= 57343 && n--;
	}
	return e.slice(0, n);
}
function* Ue(e) {
	let t = e.firstChild ?? e.childNodes[0] ?? null;
	for (; t;) {
		if (t.nodeType === 3 && (yield t), t.firstChild) {
			t = t.firstChild;
			continue;
		}
		for (; t && t !== e && !t.nextSibling;) t = t.parentNode;
		if (!t || t === e) break;
		t = t.nextSibling;
	}
}
function We(e, t, n, r, i) {
	for (let a of r) {
		let r = !1;
		try {
			r = a.intersectsNode(n);
		} catch {}
		if (r) for (let r of Ue(n)) {
			let n = r.data, o, s;
			if (a.startContainer === r) o = a.startOffset;
			else try {
				o = a.comparePoint(r, 0) === 0 ? 0 : null;
			} catch {
				o = null;
			}
			if (a.endContainer === r) s = a.endOffset;
			else try {
				s = a.comparePoint(r, n.length) === 0 ? n.length : null;
			} catch {
				s = null;
			}
			if (o === null || s === null || s <= o) continue;
			let c = i - t;
			if (c <= 0) return t;
			let l = n.slice(Math.max(0, o), Math.min(n.length, s, Math.max(0, o) + c));
			if (e.push(l), t += l.length, t >= i) return t;
		}
	}
	return t;
}
function Ge(e, t, n, r = {}) {
	if (!t || t.isCollapsed || t.rangeCount === 0) return null;
	let i = [...e.matches?.("[data-ooxml-selection-surface]") ? [e] : [], ...e.querySelectorAll("[data-ooxml-selection-surface]")];
	if (i.length === 0) return null;
	let a = (e) => i.some((t) => t.contains(e)), o = [];
	for (let n = 0; n < t.rangeCount; n++) {
		let r = t.getRangeAt(n);
		if (!e.contains(r.startContainer) || !e.contains(r.endContainer) || !a(r.startContainer) || !a(r.endContainer)) return null;
		o.push(r);
	}
	let s = Z(r.maxChars, Ve, "maxTextCharacters"), c = Z(r.maxLocators, He, "maxRunLocators"), l = [], u = !1, d = s + 2, f = [], p = 0;
	for (let t of e.querySelectorAll("[data-ooxml-selection-run]")) {
		if (!o.some((e) => {
			try {
				return e.intersectsNode(t);
			} catch {
				return !1;
			}
		})) continue;
		let e = n(t);
		if (e !== null && (l.length >= c ? u = !0 : l.push(structuredClone(e)), p < d && (p = We(f, p, t, o, d)), u && p >= d)) break;
	}
	if (l.length === 0 && !u) return null;
	let m = f.join("");
	if (m.length === 0) return null;
	let h = Q(m, s), g = m.length > s;
	return {
		text: h,
		locators: l,
		truncated: g || u,
		truncationReasons: [...g ? ["text"] : [], ...u ? ["runs"] : []],
		textCharacters: h.length,
		maxTextCharacters: s,
		maxLocators: c
	};
}
var Ke = class {
	wrapper;
	originalParent;
	originalNextSibling;
	originalDisplay;
	originalStyle;
	originalWidth;
	originalHeight;
	restored = !1;
	constructor(e, t) {
		this.canvas = e, this.options = t, this.originalParent = e.parentNode, this.originalNextSibling = e.nextSibling, this.originalDisplay = e.style.display, this.originalStyle = t.restoreMode === "style-and-bitmap" ? e.getAttribute("style") : null, this.originalWidth = e.width, this.originalHeight = e.height, this.wrapper = (e.ownerDocument ?? document).createElement("div"), this.wrapper.style.cssText = t.wrapperCssText, t.forceDisplayBlock && !e.style.display && (e.style.display = "block"), this.originalParent && this.originalParent.insertBefore(this.wrapper, e), this.wrapper.appendChild(e);
	}
	restore() {
		if (!this.restored) {
			if (this.restored = !0, this.originalParent) {
				let e = this.originalNextSibling?.parentNode === this.originalParent ? this.originalNextSibling : null;
				this.originalParent.insertBefore(this.canvas, e);
			} else this.canvas.parentNode && this.canvas.parentNode.removeChild(this.canvas);
			(this.options.restoreMode ?? "display") === "style-and-bitmap" ? (this.originalStyle === null ? this.canvas.removeAttribute("style") : this.canvas.setAttribute("style", this.originalStyle), this.canvas.width = this.originalWidth, this.canvas.height = this.originalHeight) : this.canvas.style.display = this.originalDisplay, this.wrapper.remove();
		}
	}
}, qe = "position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;pointer-events:none;user-select:text;-webkit-user-select:text;", Je = "position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;pointer-events:none;", Ye = "position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;pointer-events:none;";
function $(e, t) {
	if (!t) return null;
	let n = (e.ownerDocument ?? document).createElement("div");
	return n.style.cssText = Ye, e.appendChild(n), n;
}
function Xe(e, t) {
	if (!e || (e.innerHTML = "", !t || !Number.isFinite(t.x) || !Number.isFinite(t.y) || !Number.isFinite(t.width) || !Number.isFinite(t.height) || t.width <= 0 || t.height <= 0)) return;
	let n = (e.ownerDocument ?? document).createElement("div"), r = Number.isFinite(t.rotation) ? t.rotation ?? 0 : 0;
	n.style.cssText = `position:absolute;left:${t.x * 100}%;top:${t.y * 100}%;width:${t.width * 100}%;height:${t.height * 100}%;box-sizing:border-box;border:2px solid #1a73e8;background:color-mix(in srgb, #1a73e8 6%, transparent);transform:rotate(${r}deg);transform-origin:center;pointer-events:none;`, e.appendChild(n);
}
var Ze = class {
	textLayer;
	highlightLayer;
	elementLayer;
	constructor(e, t, n = !1) {
		let r = e.ownerDocument ?? document;
		this.textLayer = t ? r.createElement("div") : null, this.textLayer && (this.textLayer.style.cssText = qe, e.appendChild(this.textLayer)), this.highlightLayer = r.createElement("div"), this.highlightLayer.style.cssText = Je, e.appendChild(this.highlightLayer), this.elementLayer = $(e, n);
	}
};
function Qe(e, t, n) {
	if (n && t !== void 0 && t !== n.mode) throw Error(`${e}: opts.mode='${t}' conflicts with the borrowed engine's mode='${n.mode}'. Omit opts.mode when borrowing an engine — the engine owns its render mode.`);
	return n?.mode ?? t ?? "main";
}
var $e = class {
	generation = 0;
	resource;
	ownsResource;
	closed = !1;
	constructor(e, t = null, n = !1) {
		this.ownerName = e, this.resource = t, this.ownsResource = t !== null && n;
	}
	get current() {
		return this.resource;
	}
	async replace(e, t) {
		this.assertOpen();
		let n = ++this.generation, r;
		try {
			r = await e();
		} catch (e) {
			if (this.closed) throw this.closedError();
			if (n !== this.generation) return null;
			throw e;
		}
		if (this.closed) throw this.dispose(r), this.closedError();
		if (n !== this.generation) return this.dispose(r), null;
		try {
			t?.(this.resource);
		} catch (e) {
			throw this.dispose(r), e;
		}
		return this.install(r, !0), r;
	}
	install(e, t = !0) {
		this.assertOpen(), this.generation++;
		let n = this.resource, r = this.ownsResource;
		this.resource = e, this.ownsResource = t, r && n && this.dispose(n);
	}
	close() {
		if (this.closed) return;
		this.closed = !0, this.generation++;
		let e = this.resource, t = this.ownsResource;
		this.resource = null, this.ownsResource = !1, t && e && this.dispose(e);
	}
	assertOpen() {
		if (this.closed) throw this.closedError();
	}
	closedError() {
		return /* @__PURE__ */ Error(`${this.ownerName} is closed`);
	}
	dispose(e) {
		try {
			e.destroy();
		} catch {}
	}
}, et = class {
	generation = 0;
	destroyed = !1;
	bitmapContext;
	constructor(e, t) {
		this.canvas = e, this.bitmapContext = t ? e.getContext("bitmaprenderer") : null;
	}
	begin() {
		return ++this.generation;
	}
	isCurrent(e) {
		return !this.destroyed && e === this.generation;
	}
	commitBitmap(e, t, n = {}) {
		if (!this.isCurrent(e)) return t.close(), !1;
		if (!this.bitmapContext) throw t.close(), Error("bitmaprenderer context not available");
		this.canvas.width !== t.width && (this.canvas.width = t.width), this.canvas.height !== t.height && (this.canvas.height = t.height), n.cssWidth !== void 0 && (this.canvas.style.width = `${n.cssWidth}px`), n.cssHeight !== void 0 && (this.canvas.style.height = `${n.cssHeight}px`);
		try {
			this.bitmapContext.transferFromImageBitmap(t);
		} catch (e) {
			throw t.close(), e;
		}
		return !0;
	}
	destroy() {
		this.destroyed || (this.destroyed = !0, this.generation++);
	}
}, tt = class {
	closed = !1;
	constructor(e, t) {
		this.viewerName = e, this.onError = t;
	}
	report(e) {
		if (this.closed) return;
		let t = e instanceof Error ? e : Error(String(e));
		this.onError ? this.onError(t) : console.error(`[ooxml] ${this.viewerName} render failed:`, t);
	}
	close() {
		this.closed = !0;
	}
};
//#endregion
export { Ce as C, xe as E, we as S, be as T, je as _, $e as a, De as b, Xe as c, Be as d, Ie as f, Ae as g, Fe as h, et as i, Qe as l, Me as m, Ze as n, $ as o, Le as p, tt as r, Ge as s, Ke as t, X as u, Oe as v, Se as w, Ee as x, ke as y };
