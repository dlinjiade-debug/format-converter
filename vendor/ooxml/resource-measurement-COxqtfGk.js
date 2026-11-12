import { At as e, Mt as t, wt as n, yt as r } from "./line-metrics-A77J_KRx.js";
//#region packages/core/src/image/duotone-bitmap-by-path.ts
function i(e, t) {
	return t ? `${e}|duo:${t.clr1}:${t.clr2}` : e;
}
var a = "duotone";
async function o(o, s, c, l, u = {}) {
	let { offscreenFactory: d, ...f } = u, p = await e(o, s, l, f);
	return !c || !p ? p : t(a, i(o, c), l, async () => {
		let { w: e, h: t } = n(p);
		if (e <= 0 || t <= 0) return {
			bitmap: p,
			owned: !1
		};
		let i = await r(p, c, {
			width: e,
			height: t,
			offscreenFactory: d
		});
		return {
			bitmap: i,
			owned: i !== p
		};
	});
}
//#endregion
//#region packages/core/src/internal/resource-measurement.ts
function s(e, t) {
	if (!Number.isSafeInteger(e) || e < 0) throw Error(`${t} must be a non-negative safe integer`);
}
function c(e, t, n) {
	return s(e, "resource measurement"), s(t, "resource measurement"), s(n, "resource measurement limit"), e > n || t > n || t > n - e ? n === 2 ** 53 - 1 ? n : n + 1 : e + t;
}
function l(e, t = 2 ** 53 - 1) {
	s(t, "resource measurement limit");
	let n = 0;
	for (let r = 0; r < e.length; r += 1) {
		let i = e.charCodeAt(r), a;
		if (i <= 127) a = 1;
		else if (i <= 2047) a = 2;
		else if (i >= 55296 && i <= 56319 && r + 1 < e.length) {
			let t = e.charCodeAt(r + 1);
			t >= 56320 && t <= 57343 ? (a = 4, r += 1) : a = 3;
		} else a = 3;
		if (n = c(n, a, t), n > t) return n;
	}
	return n;
}
function u(e, t = 2 ** 53 - 1) {
	s(t, "resource measurement limit");
	let n = c(0, 2, t);
	if (n > t) return n;
	for (let r = 0; r < e.length; r += 1) {
		let i = e.charCodeAt(r), a;
		if (i === 34 || i === 92 || i === 8 || i === 9 || i === 10 || i === 12 || i === 13) a = 2;
		else if (i <= 31) a = 6;
		else if (i <= 127) a = 1;
		else if (i <= 2047) a = 2;
		else if (i >= 55296 && i <= 56319 && r + 1 < e.length) {
			let t = e.charCodeAt(r + 1);
			t >= 56320 && t <= 57343 ? (a = 4, r += 1) : a = 6;
		} else a = i >= 55296 && i <= 57343 ? 6 : 3;
		if (n = c(n, a, t), n > t) return n;
	}
	return n;
}
function d(e, t) {
	return c(0, e, t);
}
function f(e, t = 2 ** 53 - 1, n = !1) {
	if (s(t, "resource measurement limit"), e === null) return {
		jsonBytes: d(4, t),
		stringValueUtf8Bytes: 0
	};
	if (typeof e == "string") return {
		jsonBytes: u(e, t),
		stringValueUtf8Bytes: l(e, t)
	};
	if (typeof e == "boolean") return {
		jsonBytes: d(e ? 4 : 5, t),
		stringValueUtf8Bytes: 0
	};
	if (typeof e == "number") return {
		jsonBytes: d((Number.isFinite(e) ? String(Object.is(e, -0) ? 0 : e) : "null").length, t),
		stringValueUtf8Bytes: 0
	};
	if (typeof e == "bigint") throw TypeError("BigInt values cannot be serialized to JSON");
	if (Array.isArray(e)) {
		let n = d(2, t), r = 0;
		for (let i = 0; i < e.length; i += 1) {
			i !== 0 && (n = c(n, 1, t));
			let a = f(e[i], t, !0);
			n = c(n, a.jsonBytes, t), r = c(r, a.stringValueUtf8Bytes, t);
		}
		return {
			jsonBytes: n,
			stringValueUtf8Bytes: r
		};
	}
	if (typeof e == "object") {
		let n = d(2, t), r = 0, i = 0;
		for (let [a, o] of Object.entries(e)) {
			if (o === void 0 || typeof o == "function" || typeof o == "symbol") continue;
			i++ !== 0 && (n = c(n, 1, t)), n = c(n, u(a, t), t), n = c(n, 1, t);
			let e = f(o, t);
			n = c(n, e.jsonBytes, t), r = c(r, e.stringValueUtf8Bytes, t);
		}
		return {
			jsonBytes: n,
			stringValueUtf8Bytes: r
		};
	}
	return {
		jsonBytes: n ? d(4, t) : 0,
		stringValueUtf8Bytes: 0
	};
}
//#endregion
export { o as i, f as n, l as r, c as t };
