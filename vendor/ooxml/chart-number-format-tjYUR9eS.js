//#region packages/core/src/chart/layout.ts
function e(e, t, n) {
	let r = Math.max(1, t), i = [], a = [], o = 0;
	for (let t = 0; t < e.length; t++) {
		let s = Math.min(r, Math.max(0, e[t])), c = a.length === 0 ? s : o + n + s;
		a.length > 0 && c > r ? (i.push(a), a = [t], o = s) : (a.push(t), o = c);
	}
	return a.length > 0 && i.push(a), i;
}
var t = 14;
function n(e, t) {
	return typeof e == "number" && Number.isFinite(e) && e >= 100 && e <= 4e5 ? e / 100 * t : null;
}
function r(e, r, i) {
	return n(e.titleFontSizeHpt, i) ?? t * i;
}
var i = .62;
function a(e, t, n, a, o) {
	if (!e.title && !e.titlePresent) return {
		fontPx: 0,
		topPad: 0,
		bottomPad: 0,
		bandH: 0
	};
	let s = r(e, t, n), c = s + t * a + t * o, l = Math.min(Math.max(0, c - s), s * i);
	return {
		fontPx: s,
		topPad: l,
		bottomPad: c - s - l,
		bandH: c
	};
}
function o(t, n, r, i, a) {
	if (!t.showLegend) return null;
	let o = t.legendPos ?? "r", s = o === "l" ? "l" : o === "t" ? "t" : o === "b" ? "b" : "r";
	if (s === "r" || s === "l") {
		if (a) {
			let e = Math.min(80, n * .3), t = n * .3, r = Math.max(0, ...a.itemWidths) + a.horizontalPadding;
			return {
				side: s,
				reserveW: Math.min(t, Math.max(e, r)),
				reserveH: 0
			};
		}
		return {
			side: s,
			reserveW: Math.max(80, n * i),
			reserveH: 0
		};
	}
	if (a) {
		let t = Math.max(1, n - a.horizontalPadding), i = e(a.itemWidths, t, a.itemGap).length * a.rowHeight + a.verticalPadding;
		return {
			side: s,
			reserveW: 0,
			reserveH: Math.min(r * .3, i)
		};
	}
	return {
		side: s,
		reserveW: 0,
		reserveH: Math.max(18, r * .08)
	};
}
function s(e) {
	return {
		legRightW: e?.side === "r" ? e.reserveW : 0,
		legLeftW: e?.side === "l" ? e.reserveW : 0,
		legTopH: e?.side === "t" ? e.reserveH : 0,
		legBottomH: e?.side === "b" ? e.reserveH : 0
	};
}
function c(e, t) {
	return n(e, t) ?? 10 * t;
}
function l(e, t, n) {
	let r = 0, i = !1;
	if (n != null) switch (i = !0, n) {
		case "horz": break;
		case "vert270":
			r -= 90;
			break;
		case "vert":
		case "wordArtVert":
		case "eaVert":
		case "mongolianVert":
		case "wordArtVertRtl":
			r += 90;
			break;
	}
	return t != null && Number.isFinite(t) && (r += t / 6e4, i = !0), i ? r * Math.PI / 180 : e === "left" ? -Math.PI / 2 : e === "right" ? Math.PI / 2 : 0;
}
function u(e) {
	return Math.max(8, e * .02);
}
function d(e, t, n, r) {
	let i = c(e.catAxisTitleFontSizeHpt, r), a = c(e.valAxisTitleFontSizeHpt, r);
	return {
		catFontPx: i,
		valFontPx: a,
		catBandH: e.catAxisTitle ? i + u(n) + 4 : 0,
		valBandW: e.valAxisTitle ? a + u(t) + 4 : 0
	};
}
var f = 2.25, p = 2.75;
function m(e, t, n) {
	if (!e.title && !e.titlePresent) return {
		fontPx: 0,
		topPad: 0,
		bottomPad: 0,
		bandH: 0
	};
	let a = r(e, t, n), o = a * f, s = Math.min(Math.max(0, o - a), a * i);
	return {
		fontPx: a,
		topPad: s,
		bottomPad: o - a - s,
		bandH: o
	};
}
function h(e) {
	return e * p;
}
function g(e) {
	return 5 / 6 * e;
}
function _(e) {
	return e;
}
var v = 1.5;
function y(e) {
	let t = e.outerTextMarginPx ?? 0;
	return {
		t: e.valAxisHidden ? 0 : e.valLabelFontPx / 2 + t,
		r: (e.secondaryBandW ?? 0) > 0 ? (e.secondaryBandW ?? 0) + t : 0,
		b: e.catAxisHidden ? 0 : e.catLabelFontPx + (e.catLabelGapPx ?? g(e.catLabelFontPx)) + e.catTitleBandH + t,
		l: e.valAxisHidden ? 0 : e.valLabelWidth + (e.valLabelGapPx ?? _(e.valLabelFontPx)) + e.valTitleBandW + t
	};
}
function b(e, t, n) {
	let r = e.xMode || "factor", i = e.yMode || "factor", a = e.wMode || "factor", o = e.hMode || "factor", s = r === "edge" ? t.x + e.x * t.w : n.x + e.x * t.w, c = i === "edge" ? t.y + e.y * t.h : n.y + e.y * t.h, l = e.w == null ? n.w : a === "edge" ? t.x + e.w * t.w - s : e.w * t.w, u = e.h == null ? n.h : o === "edge" ? t.y + e.h * t.h - c : e.h * t.h;
	return ![
		s,
		c,
		l,
		u
	].every(Number.isFinite) || l <= 0 || u <= 0 ? null : {
		x: s,
		y: c,
		w: l,
		h: u
	};
}
function x(e, t, n, r, i, c, l) {
	let u = l.titleBand ?? a(e, i, c, l.titleTopPadFrac ?? 0, l.titleBottomPadFrac ?? 0), f = l.legendReserve === void 0 ? o(e, r, i, l.legendSideReserveFrac) : l.legendReserve, p = s(f), m = d(e, r, i, c), h, g, _, v;
	if (l.radialGapFrac != null) {
		let e = i * l.radialGapFrac;
		_ = r - p.legRightW - p.legLeftW, v = i - u.bandH - p.legTopH - p.legBottomH - e, h = t + p.legLeftW, g = n + u.bandH + p.legTopH + e;
	} else {
		let e = l.pad;
		if (!e) throw Error("computeChartFrame: cartesian frame requires params.pad");
		h = t + e.l, g = n + e.t, _ = r - e.l - e.r, v = i - e.t - e.b;
	}
	let y = l.honorPlotAreaManualLayout ? e.plotAreaManualLayout : null;
	if (y) {
		let e = y.layoutTarget === "inner" ? {
			t: 0,
			r: 0,
			b: 0,
			l: 0
		} : l.manualOuterInsets ?? {
			t: 0,
			r: 0,
			b: 0,
			l: 0
		}, a = y.layoutTarget === "inner" ? {
			x: h,
			y: g,
			w: _,
			h: v
		} : {
			x: h - e.l,
			y: g - e.t,
			w: _ + e.l + e.r,
			h: v + e.t + e.b
		}, o = b(y, {
			x: t,
			y: n,
			w: r,
			h: i
		}, a);
		o && o.w > e.l + e.r && o.h > e.t + e.b && (h = o.x + e.l, g = o.y + e.t, _ = o.w - e.l - e.r, v = o.h - e.t - e.b);
	}
	return {
		title: u,
		legend: f,
		legendBands: p,
		axisTitles: m,
		plotRect: {
			px0: h,
			py0: g,
			pw: _,
			ph: v
		},
		center: {
			cx: h + _ / 2,
			cy: g + v / 2
		}
	};
}
//#endregion
//#region packages/core/src/excel-date.ts
var S = 864e5, C = Date.UTC(1899, 11, 30), w = Date.UTC(1904, 0, 1);
function T(e, t = !1) {
	if (t) return new Date(w + e * S);
	let n = e < 60 ? e + 1 : e;
	return new Date(C + n * S);
}
function E(e, t = !1) {
	if (t) return (e.getTime() - w) / S;
	let n = (e.getTime() - C) / S;
	return n <= 60 ? n - 1 : n;
}
//#endregion
//#region packages/core/src/text/round-decimal.ts
function D(e, t) {
	if (!Number.isFinite(e)) return String(e);
	let n = Math.max(0, Math.trunc(t)), r = e < 0, [i, a = ""] = O(Math.abs(e).toString()).split("."), o = a.padEnd(n + 1, "0"), s = o.slice(0, n), c = o.charCodeAt(n) - 48, l = (i + s).split("").map((e) => e.charCodeAt(0) - 48);
	if (c >= 5) {
		let e = l.length - 1;
		for (; e >= 0; e--) if (l[e] === 9) l[e] = 0;
		else {
			l[e] += 1;
			break;
		}
		e < 0 && l.unshift(1);
	}
	let u = l.map((e) => String(e)).join(""), d = n, f = (d > 0 ? u.slice(0, u.length - d) : u) || "0", p = d > 0 ? u.slice(u.length - d) : "", m = f.replace(/^0+(?=\d)/, ""), h = p.length > 0 ? `${m}.${p}` : m, g = /^[0.]*$/.test(h) && !/[1-9]/.test(h);
	return r && !g ? `-${h}` : h;
}
function O(e) {
	let t = /^(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(e);
	if (!t) return e;
	let [, n, r = "", i] = t, a = parseInt(i, 10), o = n + r, s = n.length + a;
	return s <= 0 ? "0." + "0".repeat(-s) + o : s >= o.length ? o + "0".repeat(s - o.length) : o.slice(0, s) + "." + o.slice(s);
}
//#endregion
//#region packages/core/src/chart/chart-number-format.ts
function k(e) {
	return Number.isInteger(e) ? String(e) : D(e, 6).replace(/\.?0+$/, "");
}
function A(e, t, n = !1) {
	if (!t || t.trim().toLowerCase() === "general") return k(e);
	if (M(t)) return N(e, t, n);
	let r = P(t), i;
	return i = e > 0 ? r[0] ?? t : e < 0 ? r[1] ?? r[0] ?? t : r[2] ?? r[0] ?? t, i === "" ? "" : (e < 0 && r.length < 2 ? "-" : "") + F(Math.abs(e), i);
}
function j(e, t, n = !1) {
	if (!t || e.trim() === "") return e;
	let r = Number(e);
	return Number.isFinite(r) ? A(r, t, n) : e;
}
function M(e) {
	let t = !1;
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		if (r === "\"") {
			t = !t;
			continue;
		}
		if (!t) {
			if (r === "\\") {
				n++;
				continue;
			}
			if (r === "[") {
				for (; n < e.length && e[n] !== "]";) n++;
				continue;
			}
			if (r === "y" || r === "Y" || r === "d" || r === "D" || r === "m" || r === "M" || r === "h" || r === "H" || r === "s" || r === "S") return !0;
		}
	}
	return !1;
}
function N(e, t, n = !1) {
	let r = T(Math.floor(e), n), i = r.getUTCFullYear(), a = r.getUTCMonth() + 1, o = r.getUTCDate(), s = (e - Math.floor(e)) * 86400, c = Math.floor(s / 3600), l = Math.floor(s % 3600 / 60), u = Math.floor(s % 60), d = "", f = !1, p = 0;
	for (; p < t.length;) {
		let e = t[p];
		if (e === "\"") {
			f = !f, p++;
			continue;
		}
		if (f) {
			d += e, p++;
			continue;
		}
		if (e === "\\" && p + 1 < t.length) {
			d += t[p + 1], p += 2;
			continue;
		}
		if (e === "[") {
			for (; p < t.length && t[p] !== "]";) p++;
			p < t.length && p++;
			continue;
		}
		if (e === "y" || e === "Y") {
			let e = 0;
			for (; p < t.length && (t[p] === "y" || t[p] === "Y");) e++, p++;
			d += e >= 3 ? String(i) : String(i % 100).padStart(2, "0");
			continue;
		}
		if (e === "m" || e === "M") {
			let e = 0;
			for (; p < t.length && (t[p] === "m" || t[p] === "M");) e++, p++;
			d.match(/[Hh]+\W*$/) ? d += e >= 2 ? String(l).padStart(2, "0") : String(l) : d += e >= 2 ? String(a).padStart(2, "0") : String(a);
			continue;
		}
		if (e === "d" || e === "D") {
			let e = 0;
			for (; p < t.length && (t[p] === "d" || t[p] === "D");) e++, p++;
			d += e >= 2 ? String(o).padStart(2, "0") : String(o);
			continue;
		}
		if (e === "h" || e === "H") {
			let e = 0;
			for (; p < t.length && (t[p] === "h" || t[p] === "H");) e++, p++;
			d += e >= 2 ? String(c).padStart(2, "0") : String(c);
			continue;
		}
		if (e === "s" || e === "S") {
			let e = 0;
			for (; p < t.length && (t[p] === "s" || t[p] === "S");) e++, p++;
			d += e >= 2 ? String(u).padStart(2, "0") : String(u);
			continue;
		}
		d += e, p++;
	}
	return d;
}
function P(e) {
	let t = [], n = "";
	for (let r = 0; r < e.length; r++) {
		let i = e[r];
		if (i === "\\" && r + 1 < e.length) {
			n += i + e[r + 1], r++;
			continue;
		}
		if (i === "\"") {
			for (n += i, r++; r < e.length && e[r] !== "\"";) n += e[r], r++;
			r < e.length && (n += e[r]);
			continue;
		}
		if (i === "[") {
			for (n += i, r++; r < e.length && e[r] !== "]";) n += e[r], r++;
			r < e.length && (n += e[r]);
			continue;
		}
		if (i === ";") {
			t.push(n), n = "";
			continue;
		}
		n += i;
	}
	return t.push(n), t;
}
function F(e, t) {
	let n = [], r = 0, i = !1, a = !1;
	for (; r < t.length;) {
		let e = t[r];
		if (e === "\"") {
			r++;
			let e = "";
			for (; r < t.length && t[r] !== "\"";) e += t[r], r++;
			r < t.length && r++, n.push({
				kind: "lit",
				text: e
			});
			continue;
		}
		if (e === "\\" && r + 1 < t.length) {
			n.push({
				kind: "lit",
				text: t[r + 1]
			}), r += 2;
			continue;
		}
		if (e === "_" && r + 1 < t.length) {
			n.push({
				kind: "lit",
				text: " "
			}), r += 2;
			continue;
		}
		if (e === "*" && r + 1 < t.length) {
			r += 2;
			continue;
		}
		if (e === "[") {
			for (r++; r < t.length && t[r] !== "]";) r++;
			r < t.length && r++;
			continue;
		}
		if (e === "%") {
			a = !0, n.push({
				kind: "lit",
				text: "%"
			}), r++;
			continue;
		}
		if (e === "#" || e === "0" || e === "." || e === "," || e === "?") {
			let e = "";
			for (; r < t.length && (t[r] === "#" || t[r] === "0" || t[r] === "." || t[r] === "," || t[r] === "?");) e += t[r], r++;
			n.push({
				kind: "num",
				text: e
			}), i = !0;
			continue;
		}
		n.push({
			kind: "lit",
			text: e
		}), r++;
	}
	if (!i) return n.map((e) => e.text).join("");
	let o = a ? e * 100 : e, s = "";
	for (let e of n) e.kind === "num" && (s += e.text);
	let c = I(o, s), l = !1;
	return n.map((e) => e.kind === "lit" ? e.text : l ? "" : (l = !0, c)).join("");
}
function I(e, t) {
	let n = t.indexOf("."), r = n >= 0 ? t.slice(0, n) : t, i = n >= 0 ? t.slice(n + 1) : "", a = /,/.test(r), o = (i.match(/[#0?]/g) ?? []).length, s = (r.replace(/,/g, "").match(/0/g) ?? []).length, [c, l = ""] = D(e, o).split("."), u = c.padStart(s, "0"), d = a ? u.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : u;
	return o === 0 ? d : `${d}.${l.padEnd(o, "0")}`;
}
//#endregion
export { _ as C, b as S, y as _, T as a, x as b, c, m as d, h as f, o as g, s as h, D as i, u as l, d as m, k as n, E as o, g as p, A as r, v as s, j as t, l as u, n as v, e as x, a as y };
