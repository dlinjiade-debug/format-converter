import { t as e } from "./chunk-DmhlhrBa.js";
import { t } from "./slide-pull-client-CFHNk0ek.js";
import { B as n, Et as r, F as i, H as a, I as o, It as s, Lt as c, P as l, R as u, U as d, W as f, at as p, kt as m, ot as h, q as g, rt as _, sn as v, st as ee } from "./line-metrics-A77J_KRx.js";
import { t as te } from "./bounded-raw-part-cache-C6ro6Ezf.js";
import { a as ne, c as re, i as ie, l as ae, r as oe, u as se } from "./document-pull-client-DYoybVCn.js";
import { t as ce } from "./transfer-3QEJrsJa.js";
import { a as le, c as ue, d as de, l as fe, o as pe, r as me, s as he, t as ge, u as _e } from "./worksheet-pull-client-CziyJf24.js";
import { a as ve, i as ye, n as be, r as xe } from "./session-CJwZaquG.js";
import { a as Se, n as Ce, r as we, t as Te } from "./render-C5m7Ddwx.js";
import { existsSync as Ee, readFileSync as De } from "node:fs";
import { fileURLToPath as Oe } from "node:url";
import { basename as ke, dirname as Ae, resolve as je } from "node:path";
import { createRequire as Me } from "node:module";
//#region packages/core/src/internal/owned-session.ts
async function y(e, t) {
	let n = await e(), r;
	try {
		return await t(n);
	} catch (e) {
		throw r = e, e;
	} finally {
		try {
			await n.close();
		} catch (e) {
			if (r === void 0) throw e;
		}
	}
}
//#endregion
//#region packages/core/src/internal/in-process-pull-transport.ts
var b = class {
	nextRequestId = 1;
	terminated = !1;
	constructor(e, t) {
		this.dispatch = e, this.terminateHost = t;
	}
	async request(e, t, n) {
		if (this.terminated) throw Error("pull transport terminated");
		if (n?.signal?.aborted) {
			n.onCancel?.(this.nextRequestId, "abort");
			let e = /* @__PURE__ */ Error("worker request aborted");
			throw e.name = "AbortError", e;
		}
		let r = e(this.nextRequestId++), i;
		if (await this.dispatch(r, (e) => {
			i = e;
		}), i === void 0) throw Error("in-process pull host did not respond");
		return i;
	}
	forgetOrphaned(e) {}
	terminate() {
		this.terminated || (this.terminated = !0, this.terminateHost());
	}
};
//#endregion
//#region packages/node/src/wasm-loader.ts
function Ne(e) {
	return new WebAssembly.Module(De(e));
}
function Pe(e, t = Ne) {
	let n = {};
	return () => n.value ??= t(e());
}
function Fe(e, t, n) {
	let r = Ae(Oe(e)), i = je(r, t);
	if (Ee(i)) return i;
	let a = je(r, ke(t));
	return Ee(a) || !n ? a : Me(e).resolve(n);
}
//#endregion
//#region packages/node/src/pptx.ts
var Ie = Pe(() => Fe(import.meta.url, "pptx_parser_bg.wasm", "@silurus/ooxml-pptx/wasm-binary"));
async function Le(e, t = {}) {
	return Re(e, t);
}
async function Re(e, t = {}) {
	let n = await be(Ve(e), Ie(), t);
	return new ze(n.closeArchive, n.archive, n.bootstrap, n.metrics, t.signal);
}
var ze = class {
	slideCount;
	slideWidth;
	slideHeight;
	slidePull;
	slideClient;
	transport;
	started = !1;
	closed = !1;
	closePromise;
	usage;
	consumedSlides = 0;
	resourceFailure;
	renderTail = Promise.resolve();
	fetchImage = (e, t) => this.getPartInternal(e, t, (t) => t.extract_image(e));
	fetchMedia = (e) => this.getPartInternal(e, "application/octet-stream", (t) => t.extract_media(e));
	rawParts = new te({
		maxEntries: 64,
		maxBytes: g
	});
	constructor(e, n, r, i, a) {
		this.closeArchive = e, this.archive = n, this.bootstrap = r, this.metrics = i, this.signal = a, this.slideCount = r.slideCount, this.slideWidth = r.slideWidth, this.slideHeight = r.slideHeight, this.slidePull = new ye(() => this.archive), this.transport = new b((e, t) => this.slidePull.dispatchSafely(e, t), () => void 0), this.slideClient = new t({
			slideCount: this.slideCount,
			transport: this.transport,
			open: async (e, t) => {
				this.slidePull.reserveOpen(t), await this.slidePull.open(e, t);
			},
			onUsage: (e) => {
				this.usage = e, this.metrics.observeUsage(e);
			}
		});
	}
	materialize(e) {
		return {
			slideWidth: this.slideWidth,
			slideHeight: this.slideHeight,
			slides: e,
			defaultTextColor: this.bootstrap.defaultTextColor,
			majorFont: this.bootstrap.majorFont,
			minorFont: this.bootstrap.minorFont,
			...this.bootstrap.hlinkColor ? { hlinkColor: this.bootstrap.hlinkColor } : {},
			...this.bootstrap.folHlinkColor ? { folHlinkColor: this.bootstrap.folHlinkColor } : {}
		};
	}
	get resourceUsage() {
		return this.closed ? this.usage : this.refreshResourceUsage();
	}
	async getImage(e, t) {
		return this.assertOpen(), this.getPartInternal(e, t, (t) => t.extract_image(e)).catch((e) => this.failOperation(e));
	}
	async getMedia(e, t = "application/octet-stream") {
		return this.assertOpen(), this.getPartInternal(e, t, (t) => t.extract_media(e)).catch((e) => this.failOperation(e));
	}
	async renderSlide(e, t, n) {
		return this.assertOpen(), this.enqueueRender(async () => {
			x(this.signal);
			let { renderSlideNode: r } = await import("./render-C5m7Ddwx.js").then((e) => e.i);
			await r(e, {
				slideWidth: this.slideWidth,
				slideHeight: this.slideHeight,
				slides: [t],
				defaultTextColor: this.bootstrap.defaultTextColor,
				majorFont: this.bootstrap.majorFont,
				minorFont: this.bootstrap.minorFont,
				...this.bootstrap.hlinkColor ? { hlinkColor: this.bootstrap.hlinkColor } : {},
				...this.bootstrap.folHlinkColor ? { folHlinkColor: this.bootstrap.folHlinkColor } : {}
			}, 0, {
				...n,
				fetchImage: this.fetchImage,
				fetchMedia: this.fetchMedia
			}), x(this.signal);
		}).catch((e) => this.failOperation(e));
	}
	[Symbol.asyncIterator]() {
		return this.slides();
	}
	async *slides() {
		if (this.closed) throw Error("PPTX presentation session is closed");
		if (this.started) throw Error("PPTX presentation session is one-pass and was already consumed");
		this.started = !0;
		let e;
		try {
			for (let e = 0; e < this.slideCount; e += 1) {
				x(this.signal);
				let t = await this.slideClient.load(e);
				if (!t) throw Error(`PPTX slide ${e} was not decoded`);
				this.usage ??= await this.slidePull.run(() => ve((e) => e(this.archive))), this.metrics.observeUsage(this.usage), this.consumedSlides = e + 1, yield t;
			}
		} catch (t) {
			throw e = p(t) ?? t, this.metrics.fail(e), e;
		} finally {
			try {
				await this.close();
			} catch (t) {
				if (e === void 0) throw t;
			}
		}
	}
	close() {
		return this.closePromise ? this.closePromise : (this.closed = !0, this.slideClient.cancelAll(), this.closePromise = this.release(), this.closePromise);
	}
	async release() {
		let e;
		await this.renderTail, m(this.fetchImage), r(this.fetchImage);
		try {
			await this.slidePull.reset();
		} catch (t) {
			e = p(t) ?? t;
		}
		this.transport.terminate(), this.rawParts.clear();
		try {
			this.closeArchive();
		} catch (t) {
			e ??= p(t) ?? t;
		}
		if (e !== void 0) throw this.metrics.fail(e), e;
		this.metrics.checkpoint("presentation session closed"), this.metrics.succeed({ slides: this.consumedSlides });
	}
	enqueueRender(e) {
		let t = this.renderTail.then(e, e);
		return this.renderTail = t.then(() => void 0, () => void 0), t;
	}
	getPartInternal(e, t, n) {
		return this.rawParts.get(e, t, () => {
			x(this.signal);
			let e = n(this.archive);
			return this.refreshResourceUsage(), new Blob([e], { type: t });
		});
	}
	refreshResourceUsage() {
		try {
			this.usage = _(this.archive.resource_usage()), this.metrics.observeUsage(this.usage);
		} catch {}
		return this.usage;
	}
	assertOpen() {
		if (this.closed) throw Error("PPTX presentation session is closed");
		if (this.resourceFailure) throw this.resourceFailure;
	}
	failOperation(e) {
		let t = p(e) ?? e;
		throw t instanceof v && (this.resourceFailure ??= t), this.metrics.fail(t), t;
	}
};
async function Be(e, t = {}) {
	return y(() => Re(e, t), async (e) => {
		let t = [];
		for await (let n of e.slides()) t.push(n);
		return e.materialize(t);
	});
}
function Ve(e) {
	return e instanceof Uint8Array ? e : new Uint8Array(e);
}
function x(e) {
	if (!e?.aborted) return;
	let t = /* @__PURE__ */ Error("PPTX presentation session was aborted");
	throw t.name = "AbortError", t;
}
//#endregion
//#region packages/docx/src/document-pull-worker.ts
var He = Math.max(d, f), Ue = class {
	coordinator = new o();
	host = null;
	identity = null;
	constructor(e, t = (e) => e(this.requireArchive())) {
		this.archive = e, this.executeArchive = t;
	}
	open(e) {
		if (this.host) throw Error("a DOCX document pull session is already active");
		this.executeArchive((t) => {
			t.open_document_cursor(e.operationId, e.generation);
		});
		let t = 0;
		this.identity = e, this.host = new i({
			...e,
			maxByteCredit: He,
			coordinator: this.coordinator,
			driver: {
				pull: (n) => {
					let r;
					try {
						r = this.executeArchive((r) => r.pull_document_chunk(t, e.operationId, e.generation, n));
					} catch (e) {
						throw ee(e, n, He) || e;
					}
					let i = ce(r);
					return {
						payload: i,
						byteLength: i.byteLength,
						done: this.executeArchive((e) => e.document_chunk_done()),
						transfer: [i]
					};
				},
				measureChunk: ({ payload: e }) => e.byteLength,
				acknowledge: (n) => {
					if (n !== t) throw Error("DOCX document acknowledgement sequence mismatch");
					this.executeArchive((n) => n.acknowledge_document_chunk(t, e.operationId, e.generation)), t += 1;
				},
				cancel: () => this.executeArchive((e) => e.cancel_document_cursor()),
				close: () => this.executeArchive((e) => e.close_document_session()),
				resourceUsage: () => {
					let e = this.executeArchive((e) => e.document_cursor_resource_usage?.());
					return e ? _(e) : void 0;
				}
			}
		});
	}
	dispatch(e, t) {
		return !this.host || !this.identity ? (t({
			protocol: l,
			kind: "error",
			sessionId: e.sessionId,
			operationId: e.operationId,
			generation: e.generation,
			requestId: e.requestId,
			error: h(/* @__PURE__ */ Error("DOCX document pull session is not open"))
		}), Promise.resolve()) : this.host.dispatch(e, t);
	}
	async reset() {
		if (this.host) try {
			this.archive() && this.executeArchive((e) => e.close_document_session());
		} finally {
			this.host = null, this.identity = null, this.coordinator = new o();
		}
	}
	requireArchive() {
		let e = this.archive();
		if (!e) throw Error("No docx loaded");
		return e;
	}
}, We = /* @__PURE__ */ e({
	DocxArchive: () => S,
	default: () => nt,
	docx_to_markdown: () => Ge,
	extract_image: () => Ke,
	initSync: () => tt,
	parse_docx: () => qe,
	reinit: () => rt
}), S = class {
	__destroy_into_raw() {
		let e = this.__wbg_ptr;
		return this.__wbg_ptr = 0, Ye.unregister(this), e;
	}
	free() {
		let e = this.__destroy_into_raw();
		I.__wbg_docxarchive_free(e, 0);
	}
	acknowledge_document_chunk(e, t, n) {
		let r = I.docxarchive_acknowledge_document_chunk(this.__wbg_ptr, e, t, n);
		if (r[1]) throw j(r[0]);
	}
	assert_healthy() {
		let e = I.docxarchive_assert_healthy(this.__wbg_ptr);
		if (e[1]) throw j(e[0]);
	}
	cancel_document_cursor() {
		I.docxarchive_cancel_document_cursor(this.__wbg_ptr);
	}
	close_document_session() {
		I.docxarchive_close_document_session(this.__wbg_ptr);
	}
	document_chunk_done() {
		let e = I.docxarchive_document_chunk_done(this.__wbg_ptr);
		if (e[2]) throw j(e[1]);
		return e[0] !== 0;
	}
	document_cursor_resource_usage() {
		let e = I.docxarchive_document_cursor_resource_usage(this.__wbg_ptr);
		if (e[3]) throw j(e[2]);
		var t = C(e[0], e[1]).slice();
		return I.__wbindgen_free(e[0], e[1] * 1, 1), t;
	}
	extract_image(e) {
		let t = A(e, I.__wbindgen_malloc, I.__wbindgen_realloc), n = F, r = I.docxarchive_extract_image(this.__wbg_ptr, t, n);
		if (r[3]) throw j(r[2]);
		var i = C(r[0], r[1]).slice();
		return I.__wbindgen_free(r[0], r[1] * 1, 1), i;
	}
	constructor(e, t, n, r) {
		let i = k(e, I.__wbindgen_malloc), a = F, o = I.docxarchive_new(i, a, !O(t), O(t) ? BigInt(0) : t, !O(n), O(n) ? BigInt(0) : n, !O(r), O(r) ? BigInt(0) : r);
		if (o[2]) throw j(o[1]);
		return this.__wbg_ptr = o[0] >>> 0, Ye.register(this, this.__wbg_ptr, this), this;
	}
	open_document_cursor(e, t) {
		let n = I.docxarchive_open_document_cursor(this.__wbg_ptr, e, t);
		if (n[1]) throw j(n[0]);
	}
	parse() {
		let e = I.docxarchive_parse(this.__wbg_ptr);
		if (e[3]) throw j(e[2]);
		var t = C(e[0], e[1]).slice();
		return I.__wbindgen_free(e[0], e[1] * 1, 1), t;
	}
	pull_document_chunk(e, t, n, r) {
		let i = I.docxarchive_pull_document_chunk(this.__wbg_ptr, e, t, n, r);
		if (i[3]) throw j(i[2]);
		var a = C(i[0], i[1]).slice();
		return I.__wbindgen_free(i[0], i[1] * 1, 1), a;
	}
	resource_usage() {
		let e = I.docxarchive_resource_usage(this.__wbg_ptr);
		if (e[3]) throw j(e[2]);
		var t = C(e[0], e[1]).slice();
		return I.__wbindgen_free(e[0], e[1] * 1, 1), t;
	}
	to_markdown() {
		let e, t;
		try {
			let i = I.docxarchive_to_markdown(this.__wbg_ptr);
			var n = i[0], r = i[1];
			if (i[3]) throw n = 0, r = 0, j(i[2]);
			return e = n, t = r, T(n, r);
		} finally {
			I.__wbindgen_free(e, t, 1);
		}
	}
};
Symbol.dispose && (S.prototype[Symbol.dispose] = S.prototype.free);
function Ge(e, t, n) {
	let r, i;
	try {
		let s = k(e, I.__wbindgen_malloc), c = F, l = I.docx_to_markdown(s, c, !O(t), O(t) ? BigInt(0) : t, !O(n), O(n) ? BigInt(0) : n);
		var a = l[0], o = l[1];
		if (l[3]) throw a = 0, o = 0, j(l[2]);
		return r = a, i = o, T(a, o);
	} finally {
		I.__wbindgen_free(r, i, 1);
	}
}
function Ke(e, t, n, r) {
	let i = k(e, I.__wbindgen_malloc), a = F, o = A(t, I.__wbindgen_malloc, I.__wbindgen_realloc), s = F, c = I.extract_image(i, a, o, s, !O(n), O(n) ? BigInt(0) : n, !O(r), O(r) ? BigInt(0) : r);
	if (c[3]) throw j(c[2]);
	var l = C(c[0], c[1]).slice();
	return I.__wbindgen_free(c[0], c[1] * 1, 1), l;
}
function qe(e, t, n) {
	let r = k(e, I.__wbindgen_malloc), i = F, a = I.parse_docx(r, i, !O(t), O(t) ? BigInt(0) : t, !O(n), O(n) ? BigInt(0) : n);
	if (a[3]) throw j(a[2]);
	var o = C(a[0], a[1]).slice();
	return I.__wbindgen_free(a[0], a[1] * 1, 1), o;
}
function Je() {
	return {
		__proto__: null,
		"./docx_parser_bg.js": {
			__proto__: null,
			__wbg___wbindgen_throw_6b64449b9b9ed33c: function(e, t) {
				throw Error(T(e, t));
			},
			__wbg_error_a6fa202b58aa1cd3: function(e, t) {
				let n, r;
				try {
					n = e, r = t, console.error(T(e, t));
				} finally {
					I.__wbindgen_free(n, r, 1);
				}
			},
			__wbg_new_227d7c05414eb861: function() {
				return /* @__PURE__ */ Error();
			},
			__wbg_stack_3b0d974bbf31e44f: function(e, t) {
				let n = t.stack, r = A(n, I.__wbindgen_malloc, I.__wbindgen_realloc), i = F;
				Xe().setInt32(e + 4, i, !0), Xe().setInt32(e + 0, r, !0);
			},
			__wbindgen_cast_0000000000000001: function(e, t) {
				return T(e, t);
			},
			__wbindgen_init_externref_table: function() {
				let e = I.__wbindgen_externrefs, t = e.grow(4);
				e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, !0), e.set(t + 3, !1);
			}
		}
	};
}
var Ye = typeof FinalizationRegistry > "u" ? {
	register: () => {},
	unregister: () => {}
} : new FinalizationRegistry((e) => I.__wbg_docxarchive_free(e >>> 0, 1));
function C(e, t) {
	return e >>>= 0, D().subarray(e / 1, e / 1 + t);
}
var w = null;
function Xe() {
	return (w === null || w.buffer.detached === !0 || w.buffer.detached === void 0 && w.buffer !== I.memory.buffer) && (w = new DataView(I.memory.buffer)), w;
}
function T(e, t) {
	return e >>>= 0, Qe(e, t);
}
var E = null;
function D() {
	return (E === null || E.byteLength === 0) && (E = new Uint8Array(I.memory.buffer)), E;
}
function O(e) {
	return e == null;
}
function k(e, t) {
	let n = t(e.length * 1, 1) >>> 0;
	return D().set(e, n / 1), F = e.length, n;
}
function A(e, t, n) {
	if (n === void 0) {
		let n = P.encode(e), r = t(n.length, 1) >>> 0;
		return D().subarray(r, r + n.length).set(n), F = n.length, r;
	}
	let r = e.length, i = t(r, 1) >>> 0, a = D(), o = 0;
	for (; o < r; o++) {
		let t = e.charCodeAt(o);
		if (t > 127) break;
		a[i + o] = t;
	}
	if (o !== r) {
		o !== 0 && (e = e.slice(o)), i = n(i, r, r = o + e.length * 3, 1) >>> 0;
		let t = D().subarray(i + o, i + r), a = P.encodeInto(e, t);
		o += a.written, i = n(i, r, o, 1) >>> 0;
	}
	return F = o, i;
}
function j(e) {
	let t = I.__wbindgen_externrefs.get(e);
	return I.__externref_table_dealloc(e), t;
}
var M = new TextDecoder("utf-8", {
	ignoreBOM: !0,
	fatal: !0
});
M.decode();
var Ze = 2146435072, N = 0;
function Qe(e, t) {
	return N += t, N >= Ze && (M = new TextDecoder("utf-8", {
		ignoreBOM: !0,
		fatal: !0
	}), M.decode(), N = t), M.decode(D().subarray(e, e + t));
}
var P = new TextEncoder();
"encodeInto" in P || (P.encodeInto = function(e, t) {
	let n = P.encode(e);
	return t.set(n), {
		read: e.length,
		written: n.length
	};
});
var F = 0, I;
function $e(e, t) {
	return I = e.exports, w = null, E = null, I.__wbindgen_start(), I;
}
async function et(e, t) {
	if (typeof Response == "function" && e instanceof Response) {
		if (typeof WebAssembly.instantiateStreaming == "function") try {
			return await WebAssembly.instantiateStreaming(e, t);
		} catch (t) {
			if (e.ok && n(e.type) && e.headers.get("Content-Type") !== "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", t);
			else throw t;
		}
		let r = await e.arrayBuffer();
		return await WebAssembly.instantiate(r, t);
	} else {
		let n = await WebAssembly.instantiate(e, t);
		return n instanceof WebAssembly.Instance ? {
			instance: n,
			module: e
		} : n;
	}
	function n(e) {
		switch (e) {
			case "basic":
			case "cors":
			case "default": return !0;
		}
		return !1;
	}
}
function tt(e) {
	if (I !== void 0) return I;
	e !== void 0 && (Object.getPrototypeOf(e) === Object.prototype ? {module: e} = e : console.warn("using deprecated parameters for `initSync()`; pass a single object instead"));
	let t = Je();
	return e instanceof WebAssembly.Module || (e = new WebAssembly.Module(e)), $e(new WebAssembly.Instance(e, t), e);
}
async function nt(e) {
	if (I !== void 0) return I;
	e !== void 0 && (Object.getPrototypeOf(e) === Object.prototype ? {module_or_path: e} = e : console.warn("using deprecated parameters for the initialization function; pass a single object instead"));
	let t = Je();
	(typeof e == "string" || typeof Request == "function" && e instanceof Request || typeof URL == "function" && e instanceof URL) && (e = fetch(e));
	let { instance: n, module: r } = await et(await e, t);
	return $e(n, r);
}
async function rt(e) {
	return I = void 0, w = null, E = null, nt(e);
}
//#endregion
//#region packages/docx/src/internal/node-acquisition.ts
var it, L;
function at(e) {
	if (!L) it = e, L = new xe(We, e);
	else if (it !== e) throw Error("DOCX runtime was already initialized with another WebAssembly.Module");
	return L;
}
async function ot(e, t, r, i) {
	let o = n(r), s = new u({
		enabled: o.debug || o.onResourceMetrics !== void 0,
		format: "docx",
		mode: "node",
		scope: "session",
		policy: o.policy,
		onMetrics: o.onResourceMetrics,
		emitToConsole: o.debug
	});
	s.setSourceBytes(e.byteLength);
	let c, l, d;
	try {
		ct(r.signal);
		let [n, u, f] = a(o.policy), p = S;
		c = await at(t).open(() => new p(e, n, u, f), {
			signal: r.signal,
			abortError: lt,
			disposeOnAbort: (e) => e.free()
		}), ct(r.signal);
		let m = c.proxy;
		s.checkpoint("container ready"), l = new Ue(() => m);
		let h = {
			sessionId: 1,
			operationId: 1,
			generation: 1
		};
		l.open(h), d = new b((e, t) => l?.dispatch(e, t), () => void 0);
		let g, _ = await i(d, h, {
			signal: r.signal,
			onUsage: (e) => {
				g = e, s.observeUsage(e);
			}
		});
		return g ??= st(m.document_cursor_resource_usage()), s.observeUsage(g), s.checkpoint("model streamed"), await l.reset(), d.terminate(), {
			archive: m,
			result: _,
			usage: g,
			metrics: s,
			closeArchive: () => c?.close((e) => e.free())
		};
	} catch (e) {
		await l?.reset().catch(() => void 0), d?.terminate();
		try {
			c?.close((e) => e.free());
		} catch {}
		let t = p(e) ?? e;
		throw s.fail(t), t;
	}
}
function st(e) {
	try {
		return _(e);
	} catch {
		return;
	}
}
function ct(e) {
	if (e?.aborted) throw lt();
}
function lt() {
	let e = /* @__PURE__ */ Error("DOCX document session was aborted");
	return e.name = "AbortError", e;
}
//#endregion
//#region packages/node/src/docx.ts
var ut = Pe(() => Fe(import.meta.url, "docx_parser_bg.wasm", "@silurus/ooxml-docx/wasm-binary"));
async function dt(e, t) {
	if (!t?.factory) throw TypeError("openDocxDocument requires a canvas factory");
	let n = await ot(ht(e), ut(), t, (e, t, n) => oe(e, t, n));
	try {
		R(t.signal);
		let e = t.factory.createCanvas(1, 1), r = ae(n.result, { measureContext: e.getContext("2d") }), i = mt(t.currentDate), a = ne(n.result, r, i).layoutVariants.defaultLayout, o = new pt(n.closeArchive, n.archive, n.result, r, a, t.factory, i, n.usage, n.metrics, t.signal);
		return n.metrics.observeUsage(o.resourceUsage), n.metrics.checkpoint("pagination ready"), o;
	} catch (e) {
		try {
			n.closeArchive();
		} catch {}
		let t = p(e) ?? e;
		throw n.metrics.fail(t), t;
	}
}
async function ft(e, t = {}) {
	return y(async () => {
		let n = await ot(ht(e), ut(), t, (e, t, n) => ie(e, t, n)), r = !1;
		return {
			acquired: n,
			markSucceeded: () => {
				r = !0;
			},
			close: async () => {
				try {
					n.closeArchive(), r && n.metrics.succeed({ documents: 1 });
				} catch (e) {
					throw n.metrics.fail(e), e;
				}
			}
		};
	}, async ({ acquired: e, markSucceeded: t }) => {
		try {
			let n = se(e.result);
			return e.metrics.checkpoint("document materialized", e.usage), t(), n;
		} catch (t) {
			throw e.metrics.fail(t), t;
		}
	});
}
var pt = class {
	pageCount;
	sizes;
	lastResourceUsage;
	state;
	renderTail = Promise.resolve();
	pagesStarted = !1;
	closed = !1;
	closePromise;
	resourceFailure = null;
	fetchImage = async (e, t) => {
		let n = this.archive.extract_image(e);
		return new Blob([n], { type: t });
	};
	constructor(e, t, n, r, i, a, o, s, c, l) {
		this.closeArchive = e, this.archive = t, this.factory = a, this.defaultCurrentDateMs = o, this.metrics = c, this.signal = l, this.state = {
			source: n,
			services: r
		}, this.pageCount = i.pages.length, this.lastResourceUsage = s, this.sizes = Object.freeze(i.pages.map((e) => Object.freeze({
			widthPt: e.geometry.widthPt,
			heightPt: e.geometry.heightPt
		})));
	}
	get resourceUsage() {
		return this.closed ? this.lastResourceUsage : this.refreshResourceUsage();
	}
	refreshResourceUsage() {
		try {
			this.lastResourceUsage = _(this.archive.resource_usage()), this.metrics.observeUsage(this.lastResourceUsage);
		} catch {}
		return this.lastResourceUsage;
	}
	pageSize(e) {
		let t = this.sizes[e];
		if (!t) throw RangeError(`DOCX page index ${e} out of range`);
		return t;
	}
	[Symbol.asyncIterator]() {
		return this.pages();
	}
	renderPage(e, t = {}) {
		return this.closed ? Promise.reject(/* @__PURE__ */ Error("DOCX document session is closed")) : this.resourceFailure ? Promise.reject(this.resourceFailure) : (this.pageSize(e), this.enqueueRender(async () => {
			R(this.signal);
			let n = this.requireState(), r = this.factory.createCanvas(1, 1);
			return await Se(this.factory, () => re(n.source, r, e, {
				...t,
				currentDate: this.defaultCurrentDateMs,
				defaultCurrentDateMs: this.defaultCurrentDateMs,
				layoutServices: n.services,
				fetchImage: this.fetchImage
			})), R(this.signal), r;
		}).catch((e) => {
			let t = p(e) ?? e;
			throw t instanceof v && (this.resourceFailure ??= t), this.metrics.fail(t), t;
		}));
	}
	async *pages(e = {}) {
		if (this.closed) throw Error("DOCX document session is closed");
		if (this.pagesStarted) throw Error("DOCX page stream is one-pass and was already consumed");
		this.pagesStarted = !0;
		let t;
		try {
			for (let t = 0; t < this.pageCount; t += 1) {
				let n = await this.renderPage(t, e), r = this.pageSize(t);
				yield {
					pageIndex: t,
					...r,
					canvas: n
				};
			}
		} catch (e) {
			throw t = p(e) ?? e, t;
		} finally {
			try {
				await this.close();
			} catch (e) {
				if (t === void 0) throw e;
			}
		}
	}
	close() {
		return this.closePromise ? this.closePromise : (this.refreshResourceUsage(), this.closed = !0, this.closePromise = this.release(), this.closePromise);
	}
	enqueueRender(e) {
		let t = this.renderTail.then(e, e);
		return this.renderTail = t.then(() => void 0, () => void 0), t;
	}
	async release() {
		await this.renderTail, m(this.fetchImage), r(this.fetchImage), this.state = null;
		try {
			this.closeArchive();
		} catch (e) {
			let t = p(e) ?? e;
			throw this.metrics.fail(t), t;
		}
		this.metrics.checkpoint("document session closed", this.lastResourceUsage), this.metrics.succeed({ pages: this.pageCount });
	}
	requireState() {
		if (!this.state) throw Error("DOCX document session is closed");
		return this.state;
	}
};
function mt(e) {
	let t = e instanceof Date ? e.getTime() : e ?? Date.now();
	if (!Number.isFinite(t)) throw RangeError("currentDate must resolve to finite epoch milliseconds");
	return t;
}
function ht(e) {
	return e instanceof Uint8Array ? e : new Uint8Array(e);
}
function R(e) {
	if (!e?.aborted) return;
	let t = /* @__PURE__ */ Error("DOCX document session was aborted");
	throw t.name = "AbortError", t;
}
//#endregion
//#region packages/xlsx/src/wasm/xlsx_parser.js
var gt = /* @__PURE__ */ e({
	XlsxArchive: () => z,
	default: () => kt,
	extract_image: () => _t,
	initSync: () => Ot,
	parse_xlsx: () => vt,
	reinit: () => At,
	xlsx_to_markdown: () => yt
}), z = class {
	__destroy_into_raw() {
		let e = this.__wbg_ptr;
		return this.__wbg_ptr = 0, xt.unregister(this), e;
	}
	free() {
		let e = this.__destroy_into_raw();
		Q.__wbg_xlsxarchive_free(e, 0);
	}
	acknowledge_sheet_cursor_terminal() {
		let e = Q.xlsxarchive_acknowledge_sheet_cursor_terminal(this.__wbg_ptr);
		if (e[1]) throw J(e[0]);
	}
	assert_healthy() {
		let e = Q.xlsxarchive_assert_healthy(this.__wbg_ptr);
		if (e[1]) throw J(e[0]);
	}
	cancel_sheet_cursor() {
		Q.xlsxarchive_cancel_sheet_cursor(this.__wbg_ptr);
	}
	close_sheet_cursor() {
		Q.xlsxarchive_close_sheet_cursor(this.__wbg_ptr);
	}
	extract_image(e) {
		let t = q(e, Q.__wbindgen_malloc, Q.__wbindgen_realloc), n = Z, r = Q.xlsxarchive_extract_image(this.__wbg_ptr, t, n);
		if (r[3]) throw J(r[2]);
		var i = B(r[0], r[1]).slice();
		return Q.__wbindgen_free(r[0], r[1] * 1, 1), i;
	}
	constructor(e, t, n, r) {
		let i = K(e, Q.__wbindgen_malloc), a = Z, o = Q.xlsxarchive_new(i, a, !G(t), G(t) ? BigInt(0) : t, !G(n), G(n) ? BigInt(0) : n, !G(r), G(r) ? BigInt(0) : r);
		if (o[2]) throw J(o[1]);
		return this.__wbg_ptr = o[0] >>> 0, xt.register(this, this.__wbg_ptr, this), this;
	}
	open_sheet_cursor(e, t) {
		let n = q(t, Q.__wbindgen_malloc, Q.__wbindgen_realloc), r = Z, i = Q.xlsxarchive_open_sheet_cursor(this.__wbg_ptr, e, n, r);
		if (i[1]) throw J(i[0]);
	}
	parse() {
		let e = Q.xlsxarchive_parse(this.__wbg_ptr);
		if (e[3]) throw J(e[2]);
		var t = B(e[0], e[1]).slice();
		return Q.__wbindgen_free(e[0], e[1] * 1, 1), t;
	}
	pull_sheet_cursor(e) {
		let t = Q.xlsxarchive_pull_sheet_cursor(this.__wbg_ptr, e);
		if (t[3]) throw J(t[2]);
		var n = B(t[0], t[1]).slice();
		return Q.__wbindgen_free(t[0], t[1] * 1, 1), n;
	}
	resource_usage() {
		let e = Q.xlsxarchive_resource_usage(this.__wbg_ptr);
		if (e[3]) throw J(e[2]);
		var t = B(e[0], e[1]).slice();
		return Q.__wbindgen_free(e[0], e[1] * 1, 1), t;
	}
	sheet_cursor_pull_finished() {
		return Q.xlsxarchive_sheet_cursor_pull_finished(this.__wbg_ptr) !== 0;
	}
	sheet_cursor_resource_usage() {
		let e = Q.xlsxarchive_sheet_cursor_resource_usage(this.__wbg_ptr);
		if (e[3]) throw J(e[2]);
		var t = B(e[0], e[1]).slice();
		return Q.__wbindgen_free(e[0], e[1] * 1, 1), t;
	}
	to_markdown() {
		let e, t;
		try {
			let i = Q.xlsxarchive_to_markdown(this.__wbg_ptr);
			var n = i[0], r = i[1];
			if (i[3]) throw n = 0, r = 0, J(i[2]);
			return e = n, t = r, H(n, r);
		} finally {
			Q.__wbindgen_free(e, t, 1);
		}
	}
};
Symbol.dispose && (z.prototype[Symbol.dispose] = z.prototype.free);
function _t(e, t, n, r) {
	let i = K(e, Q.__wbindgen_malloc), a = Z, o = q(t, Q.__wbindgen_malloc, Q.__wbindgen_realloc), s = Z, c = Q.extract_image(i, a, o, s, !G(n), G(n) ? BigInt(0) : n, !G(r), G(r) ? BigInt(0) : r);
	if (c[3]) throw J(c[2]);
	var l = B(c[0], c[1]).slice();
	return Q.__wbindgen_free(c[0], c[1] * 1, 1), l;
}
function vt(e, t, n) {
	let r = K(e, Q.__wbindgen_malloc), i = Z, a = Q.parse_xlsx(r, i, !G(t), G(t) ? BigInt(0) : t, !G(n), G(n) ? BigInt(0) : n);
	if (a[3]) throw J(a[2]);
	var o = B(a[0], a[1]).slice();
	return Q.__wbindgen_free(a[0], a[1] * 1, 1), o;
}
function yt(e, t, n) {
	let r, i;
	try {
		let s = K(e, Q.__wbindgen_malloc), c = Z, l = Q.xlsx_to_markdown(s, c, !G(t), G(t) ? BigInt(0) : t, !G(n), G(n) ? BigInt(0) : n);
		var a = l[0], o = l[1];
		if (l[3]) throw a = 0, o = 0, J(l[2]);
		return r = a, i = o, H(a, o);
	} finally {
		Q.__wbindgen_free(r, i, 1);
	}
}
function bt() {
	return {
		__proto__: null,
		"./xlsx_parser_bg.js": {
			__proto__: null,
			__wbg___wbindgen_throw_6b64449b9b9ed33c: function(e, t) {
				throw Error(H(e, t));
			},
			__wbg_error_a6fa202b58aa1cd3: function(e, t) {
				let n, r;
				try {
					n = e, r = t, console.error(H(e, t));
				} finally {
					Q.__wbindgen_free(n, r, 1);
				}
			},
			__wbg_new_227d7c05414eb861: function() {
				return /* @__PURE__ */ Error();
			},
			__wbg_stack_3b0d974bbf31e44f: function(e, t) {
				let n = t.stack, r = q(n, Q.__wbindgen_malloc, Q.__wbindgen_realloc), i = Z;
				St().setInt32(e + 4, i, !0), St().setInt32(e + 0, r, !0);
			},
			__wbindgen_cast_0000000000000001: function(e, t) {
				return H(e, t);
			},
			__wbindgen_init_externref_table: function() {
				let e = Q.__wbindgen_externrefs, t = e.grow(4);
				e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, !0), e.set(t + 3, !1);
			}
		}
	};
}
var xt = typeof FinalizationRegistry > "u" ? {
	register: () => {},
	unregister: () => {}
} : new FinalizationRegistry((e) => Q.__wbg_xlsxarchive_free(e >>> 0, 1));
function B(e, t) {
	return e >>>= 0, W().subarray(e / 1, e / 1 + t);
}
var V = null;
function St() {
	return (V === null || V.buffer.detached === !0 || V.buffer.detached === void 0 && V.buffer !== Q.memory.buffer) && (V = new DataView(Q.memory.buffer)), V;
}
function H(e, t) {
	return e >>>= 0, Tt(e, t);
}
var U = null;
function W() {
	return (U === null || U.byteLength === 0) && (U = new Uint8Array(Q.memory.buffer)), U;
}
function G(e) {
	return e == null;
}
function K(e, t) {
	let n = t(e.length * 1, 1) >>> 0;
	return W().set(e, n / 1), Z = e.length, n;
}
function q(e, t, n) {
	if (n === void 0) {
		let n = X.encode(e), r = t(n.length, 1) >>> 0;
		return W().subarray(r, r + n.length).set(n), Z = n.length, r;
	}
	let r = e.length, i = t(r, 1) >>> 0, a = W(), o = 0;
	for (; o < r; o++) {
		let t = e.charCodeAt(o);
		if (t > 127) break;
		a[i + o] = t;
	}
	if (o !== r) {
		o !== 0 && (e = e.slice(o)), i = n(i, r, r = o + e.length * 3, 1) >>> 0;
		let t = W().subarray(i + o, i + r), a = X.encodeInto(e, t);
		o += a.written, i = n(i, r, o, 1) >>> 0;
	}
	return Z = o, i;
}
function J(e) {
	let t = Q.__wbindgen_externrefs.get(e);
	return Q.__externref_table_dealloc(e), t;
}
var Y = new TextDecoder("utf-8", {
	ignoreBOM: !0,
	fatal: !0
});
Y.decode();
var Ct = 2146435072, wt = 0;
function Tt(e, t) {
	return wt += t, wt >= Ct && (Y = new TextDecoder("utf-8", {
		ignoreBOM: !0,
		fatal: !0
	}), Y.decode(), wt = t), Y.decode(W().subarray(e, e + t));
}
var X = new TextEncoder();
"encodeInto" in X || (X.encodeInto = function(e, t) {
	let n = X.encode(e);
	return t.set(n), {
		read: e.length,
		written: n.length
	};
});
var Z = 0, Q;
function Et(e, t) {
	return Q = e.exports, V = null, U = null, Q.__wbindgen_start(), Q;
}
async function Dt(e, t) {
	if (typeof Response == "function" && e instanceof Response) {
		if (typeof WebAssembly.instantiateStreaming == "function") try {
			return await WebAssembly.instantiateStreaming(e, t);
		} catch (t) {
			if (e.ok && n(e.type) && e.headers.get("Content-Type") !== "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", t);
			else throw t;
		}
		let r = await e.arrayBuffer();
		return await WebAssembly.instantiate(r, t);
	} else {
		let n = await WebAssembly.instantiate(e, t);
		return n instanceof WebAssembly.Instance ? {
			instance: n,
			module: e
		} : n;
	}
	function n(e) {
		switch (e) {
			case "basic":
			case "cors":
			case "default": return !0;
		}
		return !1;
	}
}
function Ot(e) {
	if (Q !== void 0) return Q;
	e !== void 0 && (Object.getPrototypeOf(e) === Object.prototype ? {module: e} = e : console.warn("using deprecated parameters for `initSync()`; pass a single object instead"));
	let t = bt();
	return e instanceof WebAssembly.Module || (e = new WebAssembly.Module(e)), Et(new WebAssembly.Instance(e, t), e);
}
async function kt(e) {
	if (Q !== void 0) return Q;
	e !== void 0 && (Object.getPrototypeOf(e) === Object.prototype ? {module_or_path: e} = e : console.warn("using deprecated parameters for the initialization function; pass a single object instead"));
	let t = bt();
	(typeof e == "string" || typeof Request == "function" && e instanceof Request || typeof URL == "function" && e instanceof URL) && (e = fetch(e));
	let { instance: n, module: r } = await Dt(await e, t);
	return Et(n, r);
}
async function At(e) {
	return Q = void 0, V = null, U = null, kt(e);
}
//#endregion
//#region packages/xlsx/src/internal/node-acquisition.ts
var jt, Mt;
function Nt(e) {
	if (!Mt) jt = e, Mt = new xe(gt, e);
	else if (jt !== e) throw Error("XLSX runtime was already initialized with another WebAssembly.Module");
	return Mt;
}
async function Pt(e, t, r = {}) {
	let i = n(r), o = new u({
		enabled: i.debug || i.onResourceMetrics !== void 0,
		format: "xlsx",
		mode: "node",
		scope: "session",
		policy: i.policy,
		onMetrics: i.onResourceMetrics,
		emitToConsole: i.debug
	});
	o.setSourceBytes(e.byteLength);
	let s;
	try {
		It(r.signal);
		let [n, c, l] = a(i.policy), u = z;
		s = await Nt(t).open(() => new u(e, n, c, l), {
			signal: r.signal,
			abortError: Lt,
			disposeOnAbort: (e) => e.free()
		}), It(r.signal);
		let d = s.proxy, f = JSON.parse(new TextDecoder().decode(d.parse())), p = Ft(d.resource_usage());
		return o.observeUsage(p), o.checkpoint("workbook index ready"), {
			archive: d,
			workbookIndex: f,
			usage: p,
			metrics: o,
			closeArchive: () => s?.close((e) => e.free())
		};
	} catch (e) {
		try {
			s?.close((e) => e.free());
		} catch {}
		let t = p(e) ?? e;
		throw o.fail(t), t;
	}
}
function Ft(e) {
	try {
		return _(e);
	} catch (e) {
		if (String(e).includes("worksheet cursor usage is unavailable")) return;
		throw e;
	}
}
function It(e) {
	if (e?.aborted) throw Lt();
}
function Lt() {
	let e = /* @__PURE__ */ Error("XLSX workbook session was aborted");
	return e.name = "AbortError", e;
}
//#endregion
//#region packages/node/src/xlsx.ts
var Rt = Pe(() => Fe(import.meta.url, "xlsx_parser_bg.wasm", "@silurus/ooxml-xlsx/wasm-binary"));
async function $(e, t = {}) {
	let n = await Pt(Kt(e), Rt(), t);
	return new zt(n.closeArchive, n.archive, n.workbookIndex, n.metrics, n.usage, t.signal);
}
var zt = class {
	workbookIndex;
	sheetCount;
	sheetNames;
	pull;
	transport;
	worksheetPullClient;
	active;
	closed = !1;
	closePromise;
	lastUsage;
	completedWorksheets = 0;
	rowBatches = 0;
	emittedRows = 0;
	constructor(e, t, n, r, i, a) {
		this.closeArchive = e, this.archive = t, this.metrics = r, this.signal = a, this.workbookIndex = Wt(n), this.sheetNames = Object.freeze(this.workbookIndex.workbook.sheets.map((e) => e.name)), this.sheetCount = this.sheetNames.length, this.lastUsage = i, this.pull = new me(() => this.archive), this.transport = new b((e, t) => this.pull.dispatchSafely(e, t), () => void 0), this.worksheetPullClient = new ge({
			transport: this.transport,
			sharedStrings: n.sharedStrings,
			open: async (e, t, n) => {
				this.pull.reserveOpen(n), await this.pull.open(e, t, n);
			},
			onUsage: (e) => {
				this.lastUsage = e, this.metrics.observeUsage(e);
			}
		});
	}
	get resourceUsage() {
		if (this.closed) return this.lastUsage;
		try {
			this.lastUsage = Gt(this.archive.resource_usage());
		} catch {}
		return this.lastUsage;
	}
	async *worksheetRows(e) {
		if (this.closed) throw Error("XLSX workbook session is closed");
		if (this.active) throw Error("another XLSX worksheet row stream is already active");
		if (!Number.isSafeInteger(e) || e < 0) throw RangeError("sheetIndex must be a non-negative safe integer");
		let t = this.requireSheetName(e), n = {};
		this.active = n;
		let r;
		try {
			for await (let n of this.worksheetPullClient.stream(e, t, this.signal)) {
				if (this.closed) throw Error("XLSX workbook session is closed");
				if (n.kind === "rows") {
					this.rowBatches += 1, this.emittedRows += n.rows.length, yield {
						kind: "rows",
						rows: n.rows,
						sequence: n.sequence,
						wireBytes: n.wireBytes,
						usage: n.usage
					};
					continue;
				}
				yield {
					kind: "finished",
					worksheet: n.worksheet,
					sequence: n.sequence,
					wireBytes: n.wireBytes,
					usage: n.usage
				};
			}
			this.completedWorksheets += 1, this.metrics.checkpoint("worksheet stream complete", this.lastUsage);
		} catch (e) {
			throw r = p(e) ?? e, this.metrics.fail(r), await this.close().catch(() => void 0), r;
		} finally {
			try {
				await this.cleanupOperation(n, r === void 0 ? "closed" : "request-error");
			} catch (e) {
				if (r === void 0) {
					let t = p(e) ?? e;
					throw this.metrics.fail(t), await this.close().catch(() => void 0), t;
				}
			}
		}
	}
	close() {
		return this.closePromise ? this.closePromise : (this.closed = !0, this.closePromise = this.release(), this.closePromise);
	}
	cleanupOperation(e, t) {
		return e.cleanupPromise ||= (async () => {
			let n;
			try {
				await this.worksheetPullClient.cancelAll(t);
			} catch (e) {
				n = p(e) ?? e;
			}
			try {
				await this.pull.reset();
			} catch (e) {
				n ??= p(e) ?? e;
			}
			if (this.active === e && (this.active = void 0), n !== void 0) throw n;
		})(), e.cleanupPromise;
	}
	async release() {
		let e;
		if (this.active) try {
			await this.cleanupOperation(this.active, "closed");
		} catch (t) {
			e = p(t) ?? t;
		}
		this.transport.terminate();
		try {
			this.closeArchive();
		} catch (t) {
			e ??= p(t) ?? t;
		}
		if (e !== void 0) throw this.metrics.fail(e), e;
		this.metrics.checkpoint("workbook session closed", this.lastUsage), this.metrics.succeed({
			worksheets: this.completedWorksheets,
			"row-batches": this.rowBatches,
			rows: this.emittedRows
		});
	}
	requireSheetName(e) {
		let t = this.workbookIndex.workbook.sheets[e];
		if (!t) throw RangeError(`Sheet index ${e} out of range`);
		return t.name;
	}
};
async function Bt(e, t = {}) {
	return y(() => $(e, t), async (e) => structuredClone(e.workbookIndex));
}
async function Vt(e, t, n = {}) {
	return y(() => $(e, n), async (e) => (await Ut(e, t)).worksheet);
}
async function Ht(e, t = {}) {
	return y(() => $(e, t), async (e) => {
		let t = [], n = {
			rows: 0,
			cells: 0,
			ownedUtf8Bytes: 0,
			jsonBytes: 0
		};
		for (let r = 0; r < e.sheetCount; r += 1) {
			let i = await Ut(e, r), a = le(n, i.usage);
			he(a, "materialize-workbook", void 0, i.resourceUsage), n = a, t.push(i.worksheet);
		}
		return {
			workbookIndex: structuredClone(e.workbookIndex),
			worksheets: Object.freeze(t)
		};
	});
}
async function Ut(e, t) {
	let n = [], r = {
		rows: 0,
		cells: 0,
		ownedUtf8Bytes: 0
	}, i, a, o;
	for await (let s of e.worksheetRows(t)) if (o = s.usage ?? o, s.kind === "rows") {
		let e = pe(r, de(s.rows));
		fe(e, "materialize-worksheet", void 0, o), n.push(...s.rows), r = e;
	} else {
		a = s.worksheet, a.rows = a.parseError ? [] : n;
		let e = _e(a, a.parseError ? {
			rows: 0,
			cells: 0,
			ownedUtf8Bytes: 0
		} : r);
		fe(e, "materialize-worksheet", void 0, o), ue(e.jsonBytes, "materialize-worksheet", void 0, o), r = e, i = e;
	}
	if (!a || !i) throw Error(`XLSX worksheet ${t} did not produce a terminal model`);
	return {
		worksheet: a,
		usage: i,
		resourceUsage: o
	};
}
function Wt(e, t = /* @__PURE__ */ new WeakSet()) {
	if (typeof e != "object" || !e) return e;
	let n = e;
	if (t.has(n)) return e;
	t.add(n);
	for (let e of Object.values(n)) Wt(e, t);
	return Object.freeze(e);
}
function Gt(e) {
	try {
		return _(e);
	} catch (e) {
		if (String(e).includes("worksheet cursor usage is unavailable")) return;
		throw e;
	}
}
function Kt(e) {
	return e instanceof Uint8Array ? e : new Uint8Array(e);
}
//#endregion
export { s as OoxmlDecodedImageLimitError, v as OoxmlResourceLimitError, Te as installImageBitmapShim, Ce as installOffscreenCanvasShim, c as isOoxmlDecodedImageLimitError, ft as materializeDocxDocument, Be as materializePptxPresentation, Ht as materializeXlsxWorkbook, Bt as materializeXlsxWorkbookIndex, Vt as materializeXlsxWorksheet, dt as openDocxDocument, Le as openPptxPresentation, $ as openXlsxWorkbook, we as renderSlideNode };
