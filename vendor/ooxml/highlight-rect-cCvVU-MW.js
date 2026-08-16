//#region packages/core/src/layout/virtual-scroll.ts
function e(e, t, n) {
	return e < t ? t : e > n ? n : e;
}
function t(t, n, r, i, a, o) {
	let s = t.length;
	if (s === 0) return {
		start: 0,
		end: -1,
		topIndex: 0,
		offsets: [],
		totalHeight: 0
	};
	let c = o?.leading ?? 0, l = o?.trailing ?? 0, u = Array(s), d = 0;
	for (let e = 0; e < s; e++) u[e] = c + d + e * n, d += t[e];
	let f = c + d + (s - 1) * n + l, p = 0, m = s;
	for (; p < m;) {
		let e = p + m >>> 1;
		u[e] <= r ? p = e + 1 : m = e;
	}
	let h = e(p - 1, 0, s - 1), g = r + i;
	for (p = 0, m = s; p < m;) {
		let e = p + m >>> 1;
		u[e] < g ? p = e + 1 : m = e;
	}
	let _ = e(p - 1, 0, s - 1);
	return {
		start: e(h - a, 0, s - 1),
		end: e(_ + a, 0, s - 1),
		topIndex: h,
		offsets: u,
		totalHeight: f
	};
}
//#endregion
//#region packages/core/src/search/highlight-rect.ts
function n(e, t, n, r) {
	let i = t <= 0 ? 0 : r(e.slice(0, t)), a = n >= e.length ? r(e) : r(e.slice(0, n));
	return {
		x: i,
		width: Math.max(0, a - i)
	};
}
function r(e, t) {
	return t > 0 ? `${e / t * 100}%` : "0%";
}
//#endregion
export { n, t as r, r as t };
