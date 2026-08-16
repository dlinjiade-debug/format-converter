import { Yt as e, b as t, w as n, x as r, zt as i } from "./line-metrics-A77J_KRx.js";
//#region packages/core/src/fonts/symbol-font.ts
var a = {
	167: "♣",
	168: "♦",
	169: "♥",
	170: "♠",
	171: "↔",
	172: "←",
	173: "↑",
	174: "→",
	175: "↓",
	183: "•",
	184: "÷",
	185: "≠",
	180: "×",
	176: "°",
	177: "±",
	163: "≤",
	179: "≥"
}, o = {
	33: "✏",
	34: "✂",
	36: "👓",
	74: "☺",
	75: "😐",
	76: "☹",
	118: "❖",
	167: "▪",
	108: "●",
	110: "■",
	116: "◆",
	119: "◆",
	251: "✗",
	252: "✓",
	253: "☒",
	254: "☑",
	223: "←",
	224: "→",
	225: "↑",
	226: "↓",
	227: "↖",
	228: "↗",
	229: "↙",
	230: "↘"
};
function s(e) {
	let t = {};
	for (let n of Object.keys(e)) {
		let r = Number(n);
		t[r] = e[r], t[61440 + r] = e[r];
	}
	return t;
}
var c = s(a), l = s(o);
function u(e, t) {
	if (!t) return e;
	let n = t.trim().toLowerCase(), r = n === "wingdings" ? l : n === "symbol" ? c : null;
	return r ? r[e.charCodeAt(0)] ?? e : e;
}
function d(e) {
	if (!e) return !1;
	let t = e.toLowerCase();
	return t === "symbol" || t.includes("wingdings");
}
function f(e, t) {
	if (!d(t) || e.length === 0) return [{
		text: e,
		mapped: !1
	}];
	let n = [], r = "", i = null;
	for (let a of e) {
		let e = u(a, t), o = e !== a;
		i === null || o === i ? (i = o, r += e) : (n.push({
			text: r,
			mapped: i
		}), i = o, r = e);
	}
	return r.length > 0 && n.push({
		text: r,
		mapped: i ?? !1
	}), n;
}
//#endregion
//#region packages/core/src/shape/custGeom.ts
function p(e, t, n, r, i) {
	let a = Infinity, o = Infinity, s = -Infinity, c = -Infinity, l = (e, t) => {
		!Number.isFinite(e) || !Number.isFinite(t) || (a = Math.min(a, e), o = Math.min(o, t), s = Math.max(s, e), c = Math.max(c, t));
	};
	for (let a of e) {
		let e = 0, o = 0;
		for (let s of a) switch (s.cmd) {
			case "moveTo":
			case "lineTo":
				e = s.x, o = s.y, l(t + e * r, n + o * i);
				break;
			case "cubicBezTo":
				l(t + s.x1 * r, n + s.y1 * i), l(t + s.x2 * r, n + s.y2 * i), e = s.x, o = s.y, l(t + e * r, n + o * i);
				break;
			case "quadBezTo":
				l(t + s.x1 * r, n + s.y1 * i), e = s.x, o = s.y, l(t + e * r, n + o * i);
				break;
			case "arcTo": {
				let a = Math.abs(s.wr * r), c = Math.abs(s.hr * i);
				if (a <= 0 || c <= 0) break;
				let u = s.stAng * Math.PI / 180, d = s.swAng * Math.PI / 180, f = t + e * r, p = n + o * i, m = f - a * Math.cos(u), h = p - c * Math.sin(u);
				l(m - a, h - c), l(m + a, h + c);
				let g = u + d;
				e = (m + a * Math.cos(g) - t) / r, o = (h + c * Math.sin(g) - n) / i;
				break;
			}
			case "close": break;
		}
	}
	return Number.isFinite(a) ? {
		x: a,
		y: o,
		w: s - a,
		h: c - o
	} : null;
}
function m(e, t, n, r, i, a) {
	for (let o of t) {
		let t = 0, s = 0;
		for (let c of o) switch (c.cmd) {
			case "moveTo":
				e.moveTo(n + c.x * i, r + c.y * a), t = c.x, s = c.y;
				break;
			case "lineTo":
				e.lineTo(n + c.x * i, r + c.y * a), t = c.x, s = c.y;
				break;
			case "cubicBezTo":
				e.bezierCurveTo(n + c.x1 * i, r + c.y1 * a, n + c.x2 * i, r + c.y2 * a, n + c.x * i, r + c.y * a), t = c.x, s = c.y;
				break;
			case "quadBezTo":
				e.quadraticCurveTo(n + c.x1 * i, r + c.y1 * a, n + c.x * i, r + c.y * a), t = c.x, s = c.y;
				break;
			case "arcTo": {
				let o = c.wr * i, l = c.hr * a;
				if (o <= 0 || l <= 0) break;
				let u = c.stAng * Math.PI / 180, d = c.swAng * Math.PI / 180, f = n + t * i, p = r + s * a, m = f - o * Math.cos(u), h = p - l * Math.sin(u), g = u + d;
				e.ellipse(m, h, o, l, 0, u, g, d < 0), t = (m + o * Math.cos(g) - n) / i, s = (h + l * Math.sin(g) - r) / a;
				break;
			}
			case "close":
				e.closePath();
				break;
		}
	}
}
//#endregion
//#region packages/core/src/shape/custgeom-endpoints.ts
var h = 1e-9;
function g(e) {
	return e.cmd === "lineTo" || e.cmd === "cubicBezTo" || e.cmd === "quadBezTo" || e.cmd === "arcTo";
}
function _(e, t, n, r) {
	let i = n === 0 ? 0 : n, a = r === 0 ? 0 : r;
	return {
		x: e,
		y: t,
		dx: i,
		dy: a,
		angle: Math.atan2(a, i)
	};
}
function v(e, t, n) {
	switch (n.cmd) {
		case "lineTo": return {
			dx: n.x - e,
			dy: n.y - t
		};
		case "cubicBezTo": {
			let r = n.x1 - e, i = n.y1 - t;
			return Math.abs(r) < h && Math.abs(i) < h && (r = n.x2 - e, i = n.y2 - t), Math.abs(r) < h && Math.abs(i) < h && (r = n.x - e, i = n.y - t), {
				dx: r,
				dy: i
			};
		}
		case "quadBezTo": {
			let r = n.x1 - e, i = n.y1 - t;
			return Math.abs(r) < h && Math.abs(i) < h && (r = n.x - e, i = n.y - t), {
				dx: r,
				dy: i
			};
		}
		case "arcTo": {
			let e = n.stAng * Math.PI / 180, t = n.swAng < 0 ? -1 : 1;
			return {
				dx: -n.wr * Math.sin(e) * t,
				dy: n.hr * Math.cos(e) * t
			};
		}
		default: return {
			dx: 0,
			dy: 0
		};
	}
}
function y(e, t, n) {
	switch (n.cmd) {
		case "moveTo":
		case "lineTo":
		case "cubicBezTo":
		case "quadBezTo": return {
			x: n.x,
			y: n.y
		};
		case "arcTo": {
			if (n.wr <= 0 || n.hr <= 0) return {
				x: e,
				y: t
			};
			let r = n.stAng * Math.PI / 180, i = r + n.swAng * Math.PI / 180, a = e - n.wr * Math.cos(r), o = t - n.hr * Math.sin(r);
			return {
				x: a + n.wr * Math.cos(i),
				y: o + n.hr * Math.sin(i)
			};
		}
		default: return {
			x: e,
			y: t
		};
	}
}
function b(e, t, n) {
	let { x: r, y: i } = y(e, t, n);
	switch (n.cmd) {
		case "lineTo": return {
			dx: n.x - e,
			dy: n.y - t,
			x: r,
			y: i
		};
		case "cubicBezTo": {
			let a = n.x - n.x2, o = n.y - n.y2;
			return Math.abs(a) < h && Math.abs(o) < h && (a = n.x - n.x1, o = n.y - n.y1), Math.abs(a) < h && Math.abs(o) < h && (a = n.x - e, o = n.y - t), {
				dx: a,
				dy: o,
				x: r,
				y: i
			};
		}
		case "quadBezTo": {
			let a = n.x - n.x1, o = n.y - n.y1;
			return Math.abs(a) < h && Math.abs(o) < h && (a = n.x - e, o = n.y - t), {
				dx: a,
				dy: o,
				x: r,
				y: i
			};
		}
		case "arcTo": {
			if (n.wr <= 0 || n.hr <= 0) return {
				dx: 0,
				dy: 0,
				x: r,
				y: i
			};
			let e = n.stAng * Math.PI / 180 + n.swAng * Math.PI / 180, t = n.swAng < 0 ? -1 : 1;
			return {
				dx: -n.wr * Math.sin(e) * t,
				dy: n.hr * Math.cos(e) * t,
				x: r,
				y: i
			};
		}
		default: return {
			dx: 0,
			dy: 0,
			x: r,
			y: i
		};
	}
}
function x(e) {
	let t = 0, n = 0, r = !1;
	for (let i of e) i.cmd === "moveTo" && (r = !0), {x: t, y: n} = y(t, n, i);
	return r ? {
		x: t,
		y: n
	} : null;
}
function S(e) {
	if (e.some((e) => e.cmd === "close")) return !0;
	let t = e.find((e) => e.cmd === "moveTo");
	if (!t) return !1;
	let n = x(e);
	return !n || !e.some(g) ? !1 : Math.abs(n.x - t.x) < h && Math.abs(n.y - t.y) < h;
}
function C(e) {
	let t = {
		start: null,
		end: null
	};
	if (!e || e.length === 0) return t;
	let n = e[0];
	if (n && n.length > 0 && !S(n)) {
		let e = n.find((e) => e.cmd === "moveTo"), r = n.find(g);
		if (e && r) {
			let n = v(e.x, e.y, r);
			(Math.abs(n.dx) > h || Math.abs(n.dy) > h) && (t.start = _(e.x, e.y, -n.dx, -n.dy));
		}
	}
	let r = e[e.length - 1];
	if (r && r.length > 0 && !S(r)) {
		let e = 0, n = 0, i = -1;
		for (let e = 0; e < r.length; e++) g(r[e]) && (i = e);
		if (i >= 0) {
			for (let t = 0; t < i; t++) ({x: e, y: n} = y(e, n, r[t]));
			let a = b(e, n, r[i]);
			(Math.abs(a.dx) > h || Math.abs(a.dy) > h) && (t.end = _(a.x, a.y, a.dx, a.dy));
		}
	}
	return t;
}
//#endregion
//#region packages/core/src/shape/preset.ts
function w(e, t, n, r, i, a, o, s = -Math.PI / 2) {
	let c = a * 2;
	for (let l = 0; l < c; l++) {
		let c = s + l * Math.PI / a, u = l % 2 == 0 ? 1 : o, d = t + r * u * Math.cos(c), f = n + i * u * Math.sin(c);
		l === 0 ? e.moveTo(d, f) : e.lineTo(d, f);
	}
	e.closePath();
}
function T(e, t, n, r, i, a, o = -Math.PI / 2) {
	for (let s = 0; s < a; s++) {
		let c = o + s * 2 * Math.PI / a, l = t + r * Math.cos(c), u = n + i * Math.sin(c);
		s === 0 ? e.moveTo(l, u) : e.lineTo(l, u);
	}
	e.closePath();
}
function E(e, t, n, r, i, a, o) {
	let s = (e) => Math.atan2(r * Math.sin(e), i * Math.cos(e)), c = s(a), l = s(a + o), u = t - r * Math.cos(c), d = n - i * Math.sin(c);
	return e.ellipse(u, d, Math.abs(r), Math.abs(i), 0, c, l, o < 0), {
		x: u + r * Math.cos(l),
		y: d + i * Math.sin(l)
	};
}
var D = {
	oval: "ellipse",
	rtriangle: "rttriangle",
	roundrectangle: "roundrect",
	flowchartsumingjunction: "flowchartsummingjunction"
}, O = new Set(/* @__PURE__ */ "ellipse.rttriangle.triangle.diamond.trapezoid.roundrect.snip1rect.frame.irregularseal1.irregularseal2.star4.star8.star12.star16.star24.star32.line.straightconnector1.callout1.bordercallout1.leftuparrow.quadarrowcallout.mathequal.mathplus.mathminus.flowchartdecision.flowchartmanualinput.flowchartconnector.flowchartinputoutput.flowchartmerge.flowchartextract.flowchartpreparation.flowchartcollate".split(".")), k = new Set([
	"accentcallout1",
	"accentbordercallout1",
	"flowchartpredefinedprocess",
	"flowchartsort",
	"flowchartinternalstorage",
	"flowchartsummingjunction"
]), A = new Set([
	"round2samerect",
	"round2diagrect",
	"dodecagon",
	"star10"
]);
function j(e, t, n, r, a, o, s = null, c = null, l = null, u = null) {
	let d = n + a / 2, f = r + o / 2;
	{
		let d = t.toLowerCase(), f = D[d] ?? d;
		if ((O.has(f) || k.has(f) || A.has(f)) && i(e, f, n, r, a, o, [
			s,
			c,
			l,
			u
		])) return;
	}
	switch (t.toLowerCase()) {
		case "parallelogram": {
			let t = a * Math.min(.5, (s ?? 25e3) / 1e5);
			e.moveTo(n + t, r), e.lineTo(n + a, r), e.lineTo(n + a - t, r + o), e.lineTo(n, r + o), e.closePath();
			break;
		}
		case "pentagon":
			T(e, d, f, a / 2, o / 2, 5);
			break;
		case "hexagon":
			T(e, d, f, a / 2, o / 2, 6, 0);
			break;
		case "heptagon":
			T(e, d, f, a / 2, o / 2, 7);
			break;
		case "octagon":
			T(e, d, f, a / 2, o / 2, 8, -Math.PI / 8);
			break;
		case "decagon":
			T(e, d, f, a / 2, o / 2, 10);
			break;
		case "star5":
		case "star":
			w(e, d, f, a / 2, o / 2, 5, (s ?? 19098) / 5e4);
			break;
		case "star6":
			w(e, d, f, a / 2, o / 2, 6, (s ?? 28868) / 5e4, 0);
			break;
		case "star7":
			w(e, d, f, a / 2, o / 2, 7, (s ?? 34142) / 5e4);
			break;
		case "rightarrow": {
			let t = o * Math.min(1, (s ?? 5e4) / 1e5), i = a * Math.min(1, (c ?? 5e4) / 1e5), l = r + (o - t) / 2;
			e.moveTo(n, l), e.lineTo(n + a - i, l), e.lineTo(n + a - i, r), e.lineTo(n + a, f), e.lineTo(n + a - i, r + o), e.lineTo(n + a - i, l + t), e.lineTo(n, l + t), e.closePath();
			break;
		}
		case "leftarrow": {
			let t = o * Math.min(1, (s ?? 5e4) / 1e5), i = a * Math.min(1, (c ?? 5e4) / 1e5), l = r + (o - t) / 2;
			e.moveTo(n + a, l), e.lineTo(n + i, l), e.lineTo(n + i, r), e.lineTo(n, f), e.lineTo(n + i, r + o), e.lineTo(n + i, l + t), e.lineTo(n + a, l + t), e.closePath();
			break;
		}
		case "uparrow": {
			let t = a * Math.min(1, (s ?? 5e4) / 1e5), i = o * Math.min(1, (c ?? 5e4) / 1e5), l = n + (a - t) / 2;
			e.moveTo(d, r), e.lineTo(n + a, r + i), e.lineTo(l + t, r + i), e.lineTo(l + t, r + o), e.lineTo(l, r + o), e.lineTo(l, r + i), e.lineTo(n, r + i), e.closePath();
			break;
		}
		case "downarrow": {
			let t = a * Math.min(1, (s ?? 5e4) / 1e5), i = o * Math.min(1, (c ?? 5e4) / 1e5), l = n + (a - t) / 2;
			e.moveTo(d, r + o), e.lineTo(n + a, r + o - i), e.lineTo(l + t, r + o - i), e.lineTo(l + t, r), e.lineTo(l, r), e.lineTo(l, r + o - i), e.lineTo(n, r + o - i), e.closePath();
			break;
		}
		case "leftrightarrow": {
			let t = o * Math.min(1, (s ?? 5e4) / 1e5), i = a * Math.min(.5, (c ?? 25e3) / 1e5), l = r + (o - t) / 2;
			e.moveTo(n, f), e.lineTo(n + i, r), e.lineTo(n + i, l), e.lineTo(n + a - i, l), e.lineTo(n + a - i, r), e.lineTo(n + a, f), e.lineTo(n + a - i, r + o), e.lineTo(n + a - i, l + t), e.lineTo(n + i, l + t), e.lineTo(n + i, r + o), e.closePath();
			break;
		}
		case "updownarrow": {
			let t = a * Math.min(1, (s ?? 5e4) / 1e5), i = o * Math.min(.5, (c ?? 25e3) / 1e5), l = n + (a - t) / 2;
			e.moveTo(d, r), e.lineTo(n + a, r + i), e.lineTo(l + t, r + i), e.lineTo(l + t, r + o - i), e.lineTo(n + a, r + o - i), e.lineTo(d, r + o), e.lineTo(n, r + o - i), e.lineTo(l, r + o - i), e.lineTo(l, r + i), e.lineTo(n, r + i), e.closePath();
			break;
		}
		case "notchedrightarrow": {
			let t = o * Math.min(1, (s ?? 5e4) / 1e5), i = a * Math.min(1, (c ?? 35e3) / 1e5), l = r + (o - t) / 2, u = i * .43;
			e.moveTo(n, l), e.lineTo(n + a - i, l), e.lineTo(n + a - i, r), e.lineTo(n + a, f), e.lineTo(n + a - i, r + o), e.lineTo(n + a - i, l + t), e.lineTo(n, l + t), e.lineTo(n + u, f), e.closePath();
			break;
		}
		case "chevron": {
			let t = a * Math.min(1, Math.max(0, (s ?? 5e4) / 1e5));
			e.moveTo(n, r), e.lineTo(n + t, r), e.lineTo(n + a, f), e.lineTo(n + t, r + o), e.lineTo(n, r + o), t > 0 && e.lineTo(n + t, f), e.closePath();
			break;
		}
		case "homeplate": {
			let t = o * .4;
			e.moveTo(n, r), e.lineTo(n + a, r), e.lineTo(n + a, r + o - t), e.lineTo(d, r + o), e.lineTo(n, r + o - t), e.closePath();
			break;
		}
		case "leftbracket": {
			let t = Math.min(o * Math.min(5e4, Math.max(0, s ?? 8333)) / 1e5, o / 2);
			e.moveTo(n + a, r), e.quadraticCurveTo(n, r, n, r + t), o - 2 * t > .5 && e.lineTo(n, r + o - t), e.quadraticCurveTo(n, r + o, n + a, r + o);
			break;
		}
		case "rightbracket": {
			let t = Math.min(o * Math.min(5e4, Math.max(0, s ?? 8333)) / 1e5, o / 2);
			e.moveTo(n, r), e.quadraticCurveTo(n + a, r, n + a, r + t), o - 2 * t > .5 && e.lineTo(n + a, r + o - t), e.quadraticCurveTo(n + a, r + o, n, r + o);
			break;
		}
		case "leftbrace": {
			let t = f, i = a * .45;
			e.moveTo(n + a, r), e.bezierCurveTo(n + a - i, r, n + a - i, t - o * .08, n, t), e.bezierCurveTo(n + a - i, t + o * .08, n + a - i, r + o, n + a, r + o);
			break;
		}
		case "rightbrace": {
			let t = f, i = a * .45;
			e.moveTo(n, r), e.bezierCurveTo(n + i, r, n + i, t - o * .08, n + a, t), e.bezierCurveTo(n + i, t + o * .08, n + i, r + o, n, r + o);
			break;
		}
		case "wedgerectcallout": {
			e.rect(n, r, a, o * .8);
			let t = n + a * .2, i = r + o;
			e.moveTo(n + a * .1, r + o * .8), e.lineTo(t, i), e.lineTo(n + a * .3, r + o * .8), e.closePath();
			break;
		}
		case "wedgeellipsecallout": {
			let t = (s ?? -2e4) / 1e5 * a, n = (c ?? 12e4) / 1e5 * o, r = d + t, i = f + n;
			e.ellipse(d, f, a / 2, o / 2, 0, 0, Math.PI * 2);
			let l = Math.atan2(n, t), u = Math.PI / 10, p = a / 2, m = o / 2, h = d + p * Math.cos(l - u), g = f + m * Math.sin(l - u), _ = d + p * Math.cos(l + u), v = f + m * Math.sin(l + u);
			e.moveTo(h, g), e.lineTo(r, i), e.lineTo(_, v), e.closePath();
			break;
		}
		case "cloudcallout": {
			let t = Math.min(a, o) * .22, n = [
				[d - a * .25, r + o * .35],
				[d - a * .1, r + o * .15],
				[d + a * .1, r + o * .1],
				[d + a * .28, r + o * .2],
				[d + a * .35, r + o * .4]
			];
			e.moveTo(n[0][0] - t, n[0][1]);
			for (let [r, i] of n) e.arc(r, i, t, Math.PI, 0);
			e.arc(d, r + o * .65, a * .45, 0, Math.PI), e.closePath();
			let i = d + (s ?? -2e4) / 1e5 * a, l = f + (c ?? 12e4) / 1e5 * o;
			e.moveTo(d + a * .05, r + o * .8), e.arc(i, l, Math.min(a, o) * .07, 0, Math.PI * 2);
			break;
		}
		case "bentconnector2":
		case "bentconnector3":
		case "bentconnector4":
		case "bentconnector5":
		case "curvedconnector2":
		case "curvedconnector3":
		case "curvedconnector4":
		case "curvedconnector5":
			e.moveTo(n, r), e.lineTo(n + a, r + o);
			break;
		case "heart":
			e.moveTo(d, r + o * .32), e.bezierCurveTo(d, r, n + a * .05, r, n, r + o * .3), e.bezierCurveTo(n, r + o * .68, d - a * .05, r + o * .78, d, r + o), e.bezierCurveTo(d + a * .05, r + o * .78, n + a, r + o * .68, n + a, r + o * .3), e.bezierCurveTo(n + a - a * .05, r, d, r, d, r + o * .32);
			break;
		case "donut": {
			let t = a / 2, n = o / 2, r = Math.min(t, n) * (s ?? 25e3) / 1e5, i = t - r, c = n - r;
			e.ellipse(d, f, t, n, 0, 0, Math.PI * 2, !1), e.moveTo(d + i, f), e.ellipse(d, f, i, c, 0, 0, Math.PI * 2, !0);
			break;
		}
		case "nosmoking":
		case "nosmokingsign": {
			let t = (s ?? 18750) / 1e5, n = a / 2, r = o / 2, i = n * (1 - 2 * t), c = r * (1 - 2 * t);
			e.ellipse(d, f, n, r, 0, 0, Math.PI * 2, !1), e.moveTo(d + i, f), e.ellipse(d, f, i, c, 0, 0, Math.PI * 2, !0), e.moveTo(d + i, f), e.ellipse(d, f, i, c, 0, 0, Math.PI / 2, !1), e.lineTo(d - i, f), e.ellipse(d, f, i, c, 0, Math.PI, 3 * Math.PI / 2, !1), e.closePath();
			break;
		}
		case "pie": {
			let t = (s ?? 0) / 216e5 * Math.PI * 2, n = (c ?? 162e5) / 216e5 * Math.PI * 2;
			e.moveTo(d, f), e.arc(d, f, Math.min(a, o) / 2, t, n), e.closePath();
			break;
		}
		case "cloud": {
			let t = o * .28;
			e.arc(n + a * .25, r + o * .55, t, Math.PI, Math.PI * 1.8), e.arc(n + a * .45, r + o * .35, t * 1.1, Math.PI * 1.3, Math.PI * 1.9), e.arc(n + a * .65, r + o * .4, t, Math.PI * 1.5, Math.PI * 2), e.arc(n + a * .8, r + o * .6, t * .9, Math.PI * 1.6, Math.PI * .1), e.arc(n + a * .55, r + o * .75, t, 0, Math.PI * .7), e.arc(n + a * .25, r + o * .7, t * .9, 0, Math.PI), e.closePath();
			break;
		}
		case "funnel":
			e.moveTo(n, r), e.lineTo(n + a, r), e.lineTo(d + a * .15, r + o), e.lineTo(d - a * .15, r + o), e.closePath();
			break;
		case "smileyface": {
			e.ellipse(d, f, a / 2, o / 2, 0, 0, Math.PI * 2), e.closePath();
			let t = a * .05, n = o * .05, r = f - o * .12;
			e.moveTo(d - a * .2 + t, r), e.ellipse(d - a * .2, r, t, n, 0, 0, Math.PI * 2), e.moveTo(d + a * .2 + t, r), e.ellipse(d + a * .2, r, t, n, 0, 0, Math.PI * 2), e.moveTo(d - a * .25, f + o * .05), e.quadraticCurveTo(d, f + o * .3, d + a * .25, f + o * .05);
			break;
		}
		case "document":
		case "foldedcorner": {
			let t = Math.min(a, o) * .15;
			e.moveTo(n, r), e.lineTo(n + a - t, r), e.lineTo(n + a, r + t), e.lineTo(n + a, r + o), e.lineTo(n, r + o), e.closePath(), e.moveTo(n + a - t, r), e.lineTo(n + a - t, r + t), e.lineTo(n + a, r + t);
			break;
		}
		case "snip2samerect": {
			let t = Math.min(a, o) * Math.min(5e4, Math.max(0, s ?? 16667)) / 1e5;
			e.moveTo(n, r), e.lineTo(n + a - t, r), e.lineTo(n + a, r + t), e.lineTo(n + a, r + o), e.lineTo(n + t, r + o), e.lineTo(n, r + o - t), e.closePath();
			break;
		}
		case "snip2diagrect": {
			let t = Math.min(a, o) * Math.min(5e4, Math.max(0, s ?? 16667)) / 1e5;
			e.moveTo(n + t, r), e.lineTo(n + a - t, r), e.lineTo(n + a, r + t), e.lineTo(n + a, r + o - t), e.lineTo(n + a - t, r + o), e.lineTo(n + t, r + o), e.lineTo(n, r + o - t), e.lineTo(n, r + t), e.closePath();
			break;
		}
		case "sniproundrect": {
			let t = Math.min(a, o) * Math.min(5e4, Math.max(0, s ?? 16667)) / 1e5;
			e.moveTo(n + t, r), e.lineTo(n + a - t, r), e.lineTo(n + a, r + t), e.lineTo(n + a, r + o), e.lineTo(n, r + o), e.quadraticCurveTo(n, r, n + t, r), e.closePath();
			break;
		}
		case "round1rect": {
			let t = Math.min(a, o) * Math.min(5e4, Math.max(0, s ?? 16667)) / 1e5;
			e.moveTo(n + t, r), e.lineTo(n + a, r), e.lineTo(n + a, r + o), e.lineTo(n, r + o), e.lineTo(n, r + t), e.quadraticCurveTo(n, r, n + t, r), e.closePath();
			break;
		}
		case "plaque": {
			let t = Math.min(a, o) * .25;
			e.moveTo(n + t, r), e.lineTo(n + a - t, r), e.quadraticCurveTo(n + a, r, n + a, r + t), e.lineTo(n + a, r + o - t), e.quadraticCurveTo(n + a, r + o, n + a - t, r + o), e.lineTo(n + t, r + o), e.quadraticCurveTo(n, r + o, n, r + o - t), e.lineTo(n, r + t), e.quadraticCurveTo(n, r, n + t, r), e.closePath();
			break;
		}
		case "can": {
			let t = o * .1;
			e.ellipse(d, r + t, a / 2, t, 0, 0, Math.PI * 2), e.moveTo(n, r + t), e.lineTo(n, r + o - t), e.ellipse(d, r + o - t, a / 2, t, 0, Math.PI, 2 * Math.PI), e.lineTo(n + a, r + t);
			break;
		}
		case "cube": {
			let t = Math.min(a, o) * .2;
			e.moveTo(n + t, r), e.lineTo(n + a, r), e.lineTo(n + a, r + o - t), e.lineTo(n + a - t, r + o), e.lineTo(n, r + o), e.lineTo(n, r + t), e.closePath(), e.moveTo(n + t, r), e.lineTo(n + t, r + t), e.lineTo(n + a - t, r + t), e.moveTo(n + t, r + t), e.lineTo(n, r + t);
			break;
		}
		case "bevel": {
			let t = Math.min(a, o) * .1;
			e.rect(n, r, a, o), e.moveTo(n, r), e.lineTo(n + t, r + t), e.lineTo(n + a - t, r + t), e.lineTo(n + a, r), e.moveTo(n + a - t, r + t), e.lineTo(n + a - t, r + o - t), e.lineTo(n + a, r + o), e.moveTo(n + a - t, r + o - t), e.lineTo(n + t, r + o - t), e.lineTo(n, r + o), e.moveTo(n + t, r + o - t), e.lineTo(n + t, r + t);
			break;
		}
		case "halfframe": {
			let t = Math.min(a, o) * .25;
			e.moveTo(n, r), e.lineTo(n + a, r), e.lineTo(n + a, r + t), e.lineTo(n + t, r + t), e.lineTo(n + t, r + o), e.lineTo(n, r + o), e.closePath();
			break;
		}
		case "corner": {
			let t = Math.min(a, o) * .25;
			e.moveTo(n, r), e.lineTo(n + a, r), e.lineTo(n + a, r + t), e.lineTo(n + t, r + t), e.lineTo(n + t, r + o), e.lineTo(n, r + o), e.closePath();
			break;
		}
		case "flowchartalternateprocess":
		case "flowchartprocess": {
			let t = Math.min(a, o) * Math.min(5e4, Math.max(0, s ?? 16667)) / 1e5;
			e.roundRect(n, r, a, o, [{
				x: t,
				y: t
			}]);
			break;
		}
		case "flowchartterminator": {
			let t = Math.min(a, o) / 2;
			e.roundRect(n, r, a, o, [{
				x: t,
				y: t
			}]);
			break;
		}
		case "flowchartdocument": {
			let t = o * .1;
			e.moveTo(n, r), e.lineTo(n + a, r), e.lineTo(n + a, r + o - t), e.bezierCurveTo(n + a * .75, r + o, n + a * .25, r + o - t * 2, n, r + o - t), e.closePath();
			break;
		}
		case "moon":
			e.arc(d, f, Math.min(a, o) / 2, -Math.PI / 2, Math.PI / 2), e.arc(d - a * .2, f, Math.min(a, o) / 2, Math.PI / 2, -Math.PI / 2, !0), e.closePath();
			break;
		case "arc": {
			let t = 216e5, n = (s ?? 162e5) / t * Math.PI * 2, r = (c ?? 54e5) / t * Math.PI * 2;
			e.ellipse(d, f, a / 2, o / 2, 0, n, n + r, r < 0);
			break;
		}
		case "mathmultiply": {
			let t = Math.min(a, o) * Math.min(51965, Math.max(0, s ?? 23520)) / 1e5, i = Math.atan2(o, a), c = Math.sin(i), l = Math.cos(i), u = t / 2 * c, d = t / 2 * l;
			e.moveTo(n + u, r - d), e.lineTo(n - u, r + d), e.lineTo(n + a - u, r + o + d), e.lineTo(n + a + u, r + o - d), e.closePath(), e.moveTo(n + a - u, r - d), e.lineTo(n + a + u, r + d), e.lineTo(n + u, r + o + d), e.lineTo(n - u, r + o - d), e.closePath();
			break;
		}
		case "mathdivide": {
			let t = Math.min(36745, Math.max(1e3, s ?? 23520)), n = (73490 + -t) / 4, i = 36745 * a / o, u = Math.min(Math.min(n, i), Math.max(1e3, l ?? 11760)), p = 73490 + 4 * u - t, m = Math.min(p, Math.max(0, c ?? 5880)), h = o * t / 2e5, g = o * m / 1e5, _ = o * u / 1e5, v = a * 73490 / 2e5, y = f - h, b = f + h, x = y - (g + _) - _, S = r + o - x, C = d - v, w = d + v;
			e.rect(C, y, w - C, b - y), e.moveTo(d + _, x + _), e.arc(d, x + _, _, 0, Math.PI * 2), e.moveTo(d + _, S - _), e.arc(d, S - _, _, 0, Math.PI * 2);
			break;
		}
		case "quadarrow": {
			let t = a * (s ?? 23e3) / 1e5, i = a * (c ?? 3e4) / 1e5, l = n + (a - t) / 2, u = r + (o - t) / 2;
			e.moveTo(d, r), e.lineTo(n + a - i, r + i), e.lineTo(n + a - i, u), e.lineTo(l + t, u), e.lineTo(l + t, r + i), e.lineTo(n + i, r + i), e.lineTo(n + a, f), e.lineTo(n + a - i, r + o - i), e.lineTo(l + t, r + o - i), e.lineTo(l + t, u + t), e.lineTo(n + a - i, u + t), e.lineTo(n + a - i, r + o - i), e.lineTo(d, r + o), e.lineTo(n + i, r + o - i), e.lineTo(n + i, u + t), e.lineTo(l, u + t), e.lineTo(l, r + o - i), e.lineTo(n, f), e.lineTo(n + i, r + i), e.lineTo(l, r + i), e.lineTo(l, u), e.lineTo(n + i, u), e.closePath();
			break;
		}
		case "wave": {
			let t = o * (s ?? 12500) / 1e5, i = r + t, c = r + o - t;
			e.moveTo(n, i), e.bezierCurveTo(n + a * .25, r, n + a * .25, r + t * 2, n + a * .5, i), e.bezierCurveTo(n + a * .75, r + t * 2, n + a * .75, r, n + a, i), e.lineTo(n + a, c), e.bezierCurveTo(n + a * .75, r + o, n + a * .75, r + o - t * 2, n + a * .5, c), e.bezierCurveTo(n + a * .25, r + o - t * 2, n + a * .25, r + o, n, c), e.closePath();
			break;
		}
		case "doublewave": {
			let t = o * (s ?? 6250) / 1e5, i = r + t, c = r + o - t;
			e.moveTo(n, i), e.bezierCurveTo(n + a * .25, r, n + a * .25, r + t * 2, n + a * .5, i), e.bezierCurveTo(n + a * .75, r + t * 2, n + a * .75, r, n + a, i), e.lineTo(n + a, c), e.bezierCurveTo(n + a * .75, r + o, n + a * .75, r + o - t * 2, n + a * .5, c), e.bezierCurveTo(n + a * .25, r + o - t * 2, n + a * .25, r + o, n, c), e.closePath();
			break;
		}
		case "sun": {
			let t = Math.min(a, o) / 2, n = t * ((s ?? 25e3) / 1e5 + .5), r = Math.min(n, t * .9), i = Math.PI / 16;
			for (let n = 0; n < 8; n++) {
				let a = n / 8 * Math.PI * 2;
				e.moveTo(d + r * Math.cos(a - i), f + r * Math.sin(a - i)), e.lineTo(d + t * Math.cos(a), f + t * Math.sin(a)), e.lineTo(d + r * Math.cos(a + i), f + r * Math.sin(a + i)), e.closePath();
			}
			e.moveTo(d + r, f), e.arc(d, f, r, 0, Math.PI * 2);
			break;
		}
		case "lightningbolt":
			e.moveTo(d + a * .1, r), e.lineTo(n, f - o * .05), e.lineTo(d + a * .05, f - o * .05), e.lineTo(d - a * .1, r + o), e.lineTo(n + a, f + o * .05), e.lineTo(d - a * .05, f + o * .05), e.closePath();
			break;
		case "bracketpair": {
			let t = o * Math.min(5e4, Math.max(0, s ?? 8333)) / 1e5;
			e.moveTo(n + a * .4, r), e.quadraticCurveTo(n, r, n, r + t), o - 2 * t > 0 && e.lineTo(n, r + o - t), e.quadraticCurveTo(n, r + o, n + a * .4, r + o), e.moveTo(n + a * .6, r), e.quadraticCurveTo(n + a, r, n + a, r + t), o - 2 * t > 0 && e.lineTo(n + a, r + o - t), e.quadraticCurveTo(n + a, r + o, n + a * .6, r + o);
			break;
		}
		case "bracepair": {
			let t = a * .2;
			e.moveTo(n + a * .4, r), e.bezierCurveTo(n + a * .4 - t, r, n + a * .4 - t, f - o * .08, n, f), e.bezierCurveTo(n + a * .4 - t, f + o * .08, n + a * .4 - t, r + o, n + a * .4, r + o), e.moveTo(n + a * .6, r), e.bezierCurveTo(n + a * .6 + t, r, n + a * .6 + t, f - o * .08, n + a, f), e.bezierCurveTo(n + a * .6 + t, f + o * .08, n + a * .6 + t, r + o, n + a * .6, r + o);
			break;
		}
		case "chord": {
			let t = (s ?? 27e5) / 216e5 * Math.PI * 2, n = (c ?? 162e5) / 216e5 * Math.PI * 2;
			e.ellipse(d, f, a / 2, o / 2, 0, t, n), e.closePath();
			break;
		}
		case "blockarc": {
			let t = Math.min(a, o) / 2, n = s ?? 108e5, r = c ?? 0, i = t * (1 - (l ?? 25e3) / 1e5), u = n / 216e5 * Math.PI * 2, p = r / 216e5 * Math.PI * 2;
			e.arc(d, f, t, u, p, !1), e.arc(d, f, i, p, u, !0), e.closePath();
			break;
		}
		case "teardrop": {
			let t = Math.min(a, o) * .4, i = n + t, s = r + o - t;
			e.arc(i, s, t, 0, Math.PI * 2 * .75), e.bezierCurveTo(i - t * .1, s - t, n + a - t, r + t, n + a, r), e.bezierCurveTo(n + a - t * .2, r + t * .5, i + t, s - t * 1.1, i + t, s), e.closePath();
			break;
		}
		case "diagstripe": {
			let t = o * (s ?? 5e4) / 1e5 * a / o;
			e.moveTo(n + t, r), e.lineTo(n + a, r), e.lineTo(n + a - t, r + o), e.lineTo(n, r + o), e.closePath();
			break;
		}
		case "wedgeroundrectcallout": {
			let t = Math.min(a, o) * .1;
			e.roundRect(n, r, a, o * .85, t), e.moveTo(n + a * .1, r + o * .85), e.lineTo(n + a * .2, r + o), e.lineTo(n + a * .3, r + o * .85), e.closePath();
			break;
		}
		case "rightarrowcallout": {
			let t = o * (s ?? 5e4) / 1e5, i = a * (c ?? 5e4) / 1e5, l = r + (o - t) / 2;
			e.rect(n, l, i, t), e.moveTo(n + i, r), e.lineTo(n + a, f), e.lineTo(n + i, r + o), e.closePath();
			break;
		}
		case "leftarrowcallout": {
			let t = o * (s ?? 5e4) / 1e5, i = a * (c ?? 5e4) / 1e5, l = r + (o - t) / 2;
			e.rect(n + a - i, l, i, t), e.moveTo(n + a - i, r), e.lineTo(n, f), e.lineTo(n + a - i, r + o), e.closePath();
			break;
		}
		case "uparrowcallout": {
			let t = a * (s ?? 5e4) / 1e5, i = o * (c ?? 5e4) / 1e5, l = n + (a - t) / 2;
			e.rect(l, r + i, t, o - i), e.moveTo(n, r + i), e.lineTo(d, r), e.lineTo(n + a, r + i), e.closePath();
			break;
		}
		case "downarrowcallout": {
			let t = a * (s ?? 5e4) / 1e5, i = o * (c ?? 5e4) / 1e5, l = n + (a - t) / 2;
			e.rect(l, r, t, o - i), e.moveTo(n, r + o - i), e.lineTo(d, r + o), e.lineTo(n + a, r + o - i), e.closePath();
			break;
		}
		case "leftrightarrowcallout": {
			let t = o * (s ?? 5e4) / 1e5, i = a * (c ?? 25e3) / 1e5, l = r + (o - t) / 2;
			e.rect(n + i, l, a - 2 * i, t), e.moveTo(n + i, r), e.lineTo(n, f), e.lineTo(n + i, r + o), e.closePath(), e.moveTo(n + a - i, r), e.lineTo(n + a, f), e.lineTo(n + a - i, r + o), e.closePath();
			break;
		}
		case "leftrightuparrow": {
			let t = a * (s ?? 25e3) / 1e5, i = o * (c ?? 3e4) / 1e5, l = n + (a - t) / 2;
			e.moveTo(d, r), e.lineTo(n + a, r + i), e.lineTo(l + t, r + i), e.lineTo(l + t, r + o), e.lineTo(l, r + o), e.lineTo(l, r + i), e.lineTo(n, r + i), e.closePath();
			break;
		}
		case "uturnarrow": {
			let t = a * (s ?? 25e3) / 1e5, i = (a - t) / 2, c = Math.max(0, i - t), l = n + t + i, u = r + t + i, d = t * 2, f = r + o - t * 2.5;
			e.moveTo(n, r + o), e.lineTo(n, u), e.arc(l, u, i, Math.PI, 0), e.lineTo(n + a, f), e.lineTo(n + a + (d - t) / 2, f), e.lineTo(l + t / 2, r + o), e.lineTo(n + a - (d - t) / 2 - t, f), e.lineTo(n + a - t, f), e.lineTo(n + a - t, u), e.arc(l, u, c, 0, Math.PI, !0), e.lineTo(n + t, r + o), e.closePath();
			break;
		}
		case "bentarrow":
		case "bentuparrow": {
			let t = Math.min(a, o) * .25;
			e.moveTo(n, f - t / 2), e.lineTo(n + a - t * 2, f - t / 2), e.lineTo(n + a - t * 2, r + t), e.lineTo(n + a, f), e.lineTo(n + a - t * 2, r + o - t), e.lineTo(n + a - t * 2, f + t / 2), e.lineTo(n, f + t / 2), e.closePath();
			break;
		}
		case "plus": {
			let t = Math.min(a, o) * (s ?? 25e3) / 1e5;
			e.rect(d - t, r, 2 * t, o), e.rect(n, f - t, a, 2 * t);
			break;
		}
		case "mathnotequal": {
			let t = Math.min(5e4, Math.max(0, s ?? 23520)), n = Math.min(66e5, Math.max(42e5, c ?? 66e5)), i = Math.min(1e5 - 2 * t, Math.max(0, l ?? 11760)), u = o * t / 1e5, p = o * i / 2e5, m = a * 73490 / 2e5, h = o / 2, g = (n / 6e4 - 90) * Math.PI / 180, _ = h * Math.tan(g), v = Math.hypot(_, h) * u / h;
			e.rect(d - m, f - p - u, 2 * m, u), e.rect(d - m, f + p, 2 * m, u), e.moveTo(d + _ - v / 2, r), e.lineTo(d + _ + v / 2, r), e.lineTo(d - _ + v / 2, r + o), e.lineTo(d - _ - v / 2, r + o), e.closePath();
			break;
		}
		case "flowchartdelay": {
			let t = o / 2;
			e.moveTo(n, r), e.lineTo(n + a - t, r), e.arc(n + a - t, f, t, -Math.PI / 2, Math.PI / 2), e.lineTo(n, r + o), e.closePath();
			break;
		}
		case "flowchartdisplay": {
			let t = a * .2, i = a * .15;
			e.moveTo(n + t, r), e.lineTo(n + a - i, r), e.arc(n + a - i, f, o / 2, -Math.PI / 2, Math.PI / 2), e.lineTo(n + t, r + o), e.lineTo(n, f), e.closePath();
			break;
		}
		case "flowchartpunchedcard": {
			let t = a * .2;
			e.moveTo(n + t, r), e.lineTo(n + a, r), e.lineTo(n + a - t, r + o), e.lineTo(n, r + o), e.closePath();
			break;
		}
		case "flowchartoffpageconnector": {
			let t = o * .3;
			e.moveTo(n, r), e.lineTo(n + a, r), e.lineTo(n + a, r + o - t), e.lineTo(d, r + o), e.lineTo(n, r + o - t), e.closePath();
			break;
		}
		case "flowchartonlinestorage":
		case "flowchartmanuallabel":
		case "flowchartpuncheddisk":
			e.rect(n, r, a, o);
			break;
		case "horizontalscroll": {
			let t = Math.min(a, o) * .15;
			e.roundRect(n + t, r, a - t, o, t), e.moveTo(n + t, r + t * 2), e.arc(n + t, r + t, t, Math.PI / 2, Math.PI * 2.5);
			break;
		}
		case "verticalscroll": {
			let t = Math.min(a, o) * .15;
			e.roundRect(n, r + t, a, o - t, t), e.moveTo(n + t * 2, r + t), e.arc(n + t, r + t, t, 0, Math.PI * 2);
			break;
		}
		case "ribbon": {
			let t = Math.min(33333, Math.max(0, s ?? 16667)), i = a * Math.min(75e3, Math.max(25e3, c ?? 5e4)) / 2e5, l = a / 8, u = a / 32, d = a / 2 - i, f = a / 2 + i, p = d + u, m = f - u, h = d + l, g = f - l, _ = h - u, v = g + u, y = a - l, b = o * t / 2e5, x = o * t / 1e5, S = o - x, C = S / 2;
			e.moveTo(n, r), e.lineTo(n + _, r), e.lineTo(n + p, r + b), e.lineTo(n + m, r + x), e.lineTo(n + v, r + b), e.lineTo(n + a, r), e.lineTo(n + y, r + C), e.lineTo(n + a, r + S), e.lineTo(n + f, r + S), e.lineTo(n + f, r + o), e.lineTo(n + p, r + o), e.lineTo(n + d, r + S), e.lineTo(n, r + S), e.lineTo(n + l, r + C), e.closePath();
			break;
		}
		case "ribbon2": {
			let t = Math.min(33333, Math.max(0, s ?? 16667)), i = a * Math.min(75e3, Math.max(25e3, c ?? 5e4)) / 2e5, l = a / 8, u = a / 32, d = a / 2 - i, f = a / 2 + i, p = d + u, m = f - u, h = d + l, g = f - l, _ = h - u, v = g + u, y = a - l, b = o * t / 2e5, x = o * t / 1e5, S = o - b, C = o - x, w = x, T = (w + o) / 2;
			e.moveTo(n, r + o), e.lineTo(n + _, r + o), e.lineTo(n + p, r + S), e.lineTo(n + m, r + C), e.lineTo(n + v, r + S), e.lineTo(n + a, r + o), e.lineTo(n + y, r + T), e.lineTo(n + a, r + w), e.lineTo(n + f, r + w), e.lineTo(n + f, r), e.lineTo(n + p, r), e.lineTo(n + d, r + w), e.lineTo(n, r + w), e.lineTo(n + l, r + T), e.closePath();
			break;
		}
		case "ellipseribbon": {
			let t = Math.min(1e5, Math.max(0, s ?? 25e3)), i = Math.min(75e3, Math.max(25e3, c ?? 5e4)), u = Math.max(0, t - (1e5 - t) / 2), d = Math.min(t, Math.max(u, l ?? 12500)), f = a / 8, p = a * i / 2e5, m = a / 2 - p, h = m + f, g = a - h, _ = a - m, v = a - f, y = o * d / 1e5, b = 4 * y / a, x = b * (h - h * h / a), S = h / 2, C = b * S, w = a - S, T = o * t / 1e5, E = T - y, D = b * (m - m * m / a), O = D + E, k = y + E - O + y + E, A = o - T, j = (y * 14 / 16 + A) / 2, M = D + A, N = O + A, P = m / 2, F = b * P + A, I = a - P, L = k + A;
			e.moveTo(n, r), e.quadraticCurveTo(n + S, r + C, n + h, r + x), e.lineTo(n + m, r + O), e.quadraticCurveTo(n + a / 2, r + k, n + _, r + O), e.lineTo(n + g, r + x), e.quadraticCurveTo(n + w, r + C, n + a, r), e.lineTo(n + v, r + j), e.lineTo(n + a, r + A), e.quadraticCurveTo(n + I, r + F, n + _, r + M), e.lineTo(n + _, r + N), e.quadraticCurveTo(n + a / 2, r + L, n + m, r + N), e.lineTo(n + m, r + M), e.quadraticCurveTo(n + P, r + F, n, r + A), e.lineTo(n + f, r + j), e.closePath();
			break;
		}
		case "ellipseribbon2": {
			let t = Math.min(1e5, Math.max(0, s ?? 25e3)), i = Math.min(75e3, Math.max(25e3, c ?? 5e4)), u = Math.max(0, t - (1e5 - t) / 2), d = Math.min(t, Math.max(u, l ?? 12500)), f = a / 8, p = a * i / 2e5, m = a / 2 - p, h = m + f, g = a - h, _ = a - m, v = a - f, y = o * d / 1e5, b = 4 * y / a, x = o - b * (h - h * h / a), S = h / 2, C = o - b * S, w = a - S, T = o * t / 1e5, E = T - y, D = b * (m - m * m / a), O = D + E, k = o - O, A = y + E - O + y + E, j = o - A, M = o - T, N = o - (y * 14 / 16 + M) / 2, P = o - (D + M), F = o - (O + M), I = m / 2, L = o - (b * I + M), R = a - I, z = o - (A + M);
			e.moveTo(n, r + o), e.quadraticCurveTo(n + S, r + C, n + h, r + x), e.lineTo(n + m, r + k), e.quadraticCurveTo(n + a / 2, r + j, n + _, r + k), e.lineTo(n + g, r + x), e.quadraticCurveTo(n + w, r + C, n + a, r + o), e.lineTo(n + v, r + N), e.lineTo(n + a, r + T), e.quadraticCurveTo(n + R, r + L, n + _, r + P), e.lineTo(n + _, r + F), e.quadraticCurveTo(n + a / 2, r + z, n + m, r + F), e.lineTo(n + m, r + P), e.quadraticCurveTo(n + I, r + L, n, r + T), e.lineTo(n + f, r + N), e.closePath();
			break;
		}
		case "circulararrow": {
			let t = (c ?? 0) / 6e4 * Math.PI / 180, n = (s ?? 162e5) / 6e4 * Math.PI / 180, r = (l ?? 5e4) / 1e5, i = Math.min(a, o) / 2, u = i * (1 - r), p = (i + u) / 2, m = i - u, h = t + n;
			e.arc(d, f, i, t, h, !1), e.arc(d, f, u, h, t, !0), e.closePath();
			let g = Math.sin(h), _ = -Math.cos(h), v = m * 1.5, y = d + p * Math.cos(h) + v * g, b = f + p * Math.sin(h) + v * _;
			e.moveTo(y, b), e.lineTo(d + i * Math.cos(h), f + i * Math.sin(h)), e.lineTo(d + u * Math.cos(h), f + u * Math.sin(h)), e.closePath();
			break;
		}
		case "curvedrightarrow": {
			let t = Math.min(a, o), i = o / 2, u = 5e4 * o / t, d = Math.min(u, Math.max(0, c ?? 5e4)), f = t * Math.min(d, Math.max(0, s ?? 25e3)) / 1e5, p = t * d / 1e5, m = i - (f + p) / 4, h = (2 * m) ** 2 - f ** 2, g = 1e5 * (Math.sqrt(Math.max(0, h)) * a / (2 * m)) / t, _ = t * Math.min(g, Math.max(0, l ?? 25e3)) / 1e5, v = Math.sqrt(Math.max(0, a * a - _ * _)) * m / a, y = m + f, b = m + v, x = y + v, S = (p - f) / 2, C = b - S, w = x + S, T = o - p / 2, D = a - _, O = Math.atan2(_, v), k = -O, A = Math.PI - O;
			e.moveTo(n, r + m), E(e, n, r + m, a, m, Math.PI, k), e.lineTo(n + D, r + C), e.lineTo(n + a, r + T), e.lineTo(n + D, r + w), e.lineTo(n + D, r + x), E(e, n + D, r + x, a, m, A, O), e.closePath();
			break;
		}
		case "curvedleftarrow": {
			let t = Math.min(a, o), i = o / 2, u = 5e4 * o / t, d = Math.min(u, Math.max(0, c ?? 5e4)), f = t * Math.min(d, Math.max(0, s ?? 25e3)) / 1e5, p = t * d / 1e5, m = i - (f + p) / 4, h = (2 * m) ** 2 - f ** 2, g = Math.sqrt(Math.max(0, h)) * a / (2 * m), _ = 1e5 * g / t, v = t * Math.min(_, Math.max(0, l ?? 25e3)) / 1e5, y = Math.sqrt(Math.max(0, a * a - v * v)) * m / a, b = m + f, x = m + y, S = b + y, C = (p - f) / 2, w = x - C, T = S + C, D = o - p / 2, O = v, k = Math.atan2(v, y), A = f / 2, j = Math.atan2(A, g), M = j - k, N = k - j, P = -j;
			e.moveTo(n, r + D), e.lineTo(n + O, r + w), e.lineTo(n + O, r + x);
			let F = E(e, n + O, r + x, a, m, k, M);
			E(e, F.x, F.y, a, m, P, N), e.lineTo(n + O, r + T), e.closePath();
			break;
		}
		case "curveduparrow": {
			let t = Math.min(a, o), i = a / 2, u = 5e4 * a / t, d = Math.min(u, Math.max(0, c ?? 5e4)), f = t * Math.min(1e5, Math.max(0, s ?? 25e3)) / 1e5, p = t * d / 1e5, m = i - (f + p) / 4, h = (2 * m) ** 2 - f ** 2, g = Math.sqrt(Math.max(0, h)) * o / (2 * m), _ = 1e5 * g / t, v = t * Math.min(_, Math.max(0, l ?? 25e3)) / 1e5, y = Math.sqrt(Math.max(0, o * o - v * v)) * m / o, b = m + f, x = m + y, S = b + y, C = (p - f) / 2, w = x - C, T = S + C, D = a - p / 2, O = v, k = Math.atan2(v, y), A = f / 2, j = Math.atan2(A, g), M = j - k, N = k - j, P = Math.PI / 2 - k, F = Math.PI / 2 - j;
			e.moveTo(n + D, r), e.lineTo(n + T, r + O), e.lineTo(n + S, r + O);
			let I = E(e, n + S, r + O, m, o, P, N);
			E(e, I.x, I.y, m, o, F, M), e.lineTo(n + w, r + O), e.closePath();
			break;
		}
		case "curveddownarrow": {
			let t = Math.min(a, o), i = a / 2, u = 5e4 * a / t, d = Math.min(u, Math.max(0, c ?? 5e4)), f = t * Math.min(1e5, Math.max(0, s ?? 25e3)) / 1e5, p = t * d / 1e5, m = i - (f + p) / 4, h = (2 * m) ** 2 - f ** 2, g = Math.sqrt(Math.max(0, h)) * o / (2 * m), _ = 1e5 * g / t, v = t * Math.min(_, Math.max(0, l ?? 25e3)) / 1e5, y = Math.sqrt(Math.max(0, o * o - v * v)) * m / o, b = m + f, x = m + y, S = b + y, C = (p - f) / 2, w = x - C, T = S + C, D = a - p / 2, O = o - v, k = Math.atan2(v, y), A = f / 2, j = Math.atan2(A, g), M = 3 * Math.PI / 2 + k;
			3 * Math.PI / 2 - j, j - Math.PI / 2, Math.PI / 2 - j, e.moveTo(n + D, r + o), e.lineTo(n + w, r + O), e.lineTo(n + x, r + O), E(e, n + x, r + O, m, o, M, -k), e.lineTo(n + b, r), E(e, n + b, r, m, o, 3 * Math.PI / 2, k), e.lineTo(n + T, r + O), e.closePath();
			break;
		}
		case "stripedrightarrow": {
			let t = Math.min(a, o), i = t / 32, l = t / 16, u = t / 8, d = t * (s ?? 5e4) / 1e5, p = a * (c ?? 5e4) / 1e5, m = f - d / 2, h = f + d / 2, g = n + a - p;
			e.rect(n, m, i, d), e.rect(n + l, m, l, d), e.rect(n + u, m, u, d), e.moveTo(g, m), e.lineTo(g, r), e.lineTo(n + a, f), e.lineTo(g, r + o), e.lineTo(g, h), e.lineTo(n + u * 2, h), e.lineTo(n + u * 2, m), e.closePath();
			break;
		}
		case "flowchartmagneticdisk": {
			let t = o * .15;
			e.moveTo(n, r + t), e.ellipse(d, r + t, a / 2, t, 0, Math.PI, 0), e.lineTo(n + a, r + o - t), e.ellipse(d, r + o - t, a / 2, t, 0, 0, Math.PI), e.lineTo(n, r + t), e.closePath(), e.moveTo(n + a, r + t), e.ellipse(d, r + t, a / 2, t, 0, 0, Math.PI);
			break;
		}
		case "flowchartmagneticdrum": {
			let t = a * .15;
			e.moveTo(n + t, r), e.lineTo(n + a, r), e.lineTo(n + a, r + o), e.lineTo(n + t, r + o), e.ellipse(n + t, f, t, o / 2, 0, Math.PI / 2, -Math.PI / 2, !0), e.closePath(), e.moveTo(n + a, r), e.ellipse(n + a, f, t, o / 2, 0, -Math.PI / 2, Math.PI / 2);
			break;
		}
		case "flowchartmagnetictape": {
			let t = Math.min(a, o) / 2, n = d + t * .5;
			e.moveTo(d, r + o), e.arc(d, f, t, Math.PI / 2, Math.PI / 2 + Math.PI * 2 * .875), e.lineTo(n, f + t * .5), e.lineTo(n, r + o), e.closePath();
			break;
		}
		case "flowchartpunchedtape": {
			let t = o * .12;
			e.moveTo(n, r), e.lineTo(n + a, r), e.lineTo(n + a, r + o - t), e.bezierCurveTo(n + a * .75, r + o, n + a * .25, r + o - t * 2, n, r + o - t), e.closePath(), e.moveTo(n, r + t), e.bezierCurveTo(n + a * .25, r, n + a * .75, r + t * 2, n + a, r + t);
			break;
		}
		case "flowchartmanualoperation": {
			let t = a * .15;
			e.moveTo(n + t, r), e.lineTo(n + a - t, r), e.lineTo(n + a, r + o), e.lineTo(n, r + o), e.closePath();
			break;
		}
		case "flowchartmultidocument": {
			let t = o * .1, i = a * .04;
			e.rect(n + i * 2, r - o * .08, a - i * 2, o * .1), e.rect(n + i, r - o * .04, a - i, o * .06), e.moveTo(n, r), e.lineTo(n + a, r), e.lineTo(n + a, r + o - t), e.bezierCurveTo(n + a * .75, r + o, n + a * .25, r + o - t * 2, n, r + o - t), e.closePath();
			break;
		}
		case "rttriangle":
			e.moveTo(n, r), e.lineTo(n, r + o), e.lineTo(n + a, r + o), e.closePath();
			break;
		default:
			e.rect(n, r, a, o);
			break;
	}
}
//#endregion
//#region packages/core/src/shape/arrow.ts
function M(e, t, n) {
	let r = Math.max(.5, t.width * n), i = e.w === "sm" ? 4 : e.w === "lg" ? 8 : 6, a = e.len === "sm" ? 4 : e.len === "lg" ? 8 : 6;
	return {
		lw: r,
		halfW: r * i / 2,
		len: r * a
	};
}
var N = new Set([
	"triangle",
	"stealth",
	"diamond",
	"oval"
]);
function P(e, t, n) {
	return N.has(e.type) ? M(e, t, n).len : 0;
}
function F(e, t, n) {
	if (e.type === "none") return 0;
	let { lw: r, halfW: i, len: a } = M(e, t, n);
	return Math.max(a, i) + r / 2;
}
function I(e, t, n) {
	if (n <= 0) return {
		x: e.x,
		y: e.y
	};
	let r = t.x - e.x, i = t.y - e.y, a = Math.hypot(r, i);
	if (a < 1e-9) return {
		x: e.x,
		y: e.y
	};
	let o = Math.min(n, a) / a;
	return {
		x: e.x + r * o,
		y: e.y + i * o
	};
}
function L(t, n, r, i, a, o, s, c) {
	if (a.type === "none") return;
	let { lw: l, halfW: u, len: d } = M(a, o, s), f = c ?? e(o.color);
	switch (t.save(), t.translate(n, r), t.rotate(i), t.fillStyle = f, t.strokeStyle = f, t.lineWidth = l, t.setLineDash([]), t.beginPath(), a.type) {
		case "triangle":
		case "stealth":
			t.moveTo(0, 0), t.lineTo(-d, -u), t.lineTo(-d, u), t.closePath(), t.fill();
			break;
		case "arrow":
			t.lineCap = "round", t.lineJoin = "round", t.moveTo(-d, -u), t.lineTo(0, 0), t.lineTo(-d, u), t.stroke();
			break;
		case "diamond":
			t.moveTo(0, 0), t.lineTo(-d / 2, -u), t.lineTo(-d, 0), t.lineTo(-d / 2, u), t.closePath(), t.fill();
			break;
		case "oval":
			t.ellipse(-d / 2, 0, d / 2, u, 0, 0, Math.PI * 2), t.fill();
			break;
	}
	t.restore();
}
//#endregion
//#region packages/core/src/text/line-distribute.ts
var R = (e) => e === 32 || e === 12288;
function z(e, i, a = {}) {
	if (Math.abs(i) <= .5) return null;
	let o = a.firstContentSi ?? 0, s = a.lastDrawnSi ?? e.length - 1, c = a.minPerGap ?? -Infinity, l = a.isGapChar ?? n, u = a.isWhitespace ?? R, d = a.seaClusterGaps ?? !1, f = [];
	for (let t = o; t < e.length; t++) {
		let n = e[t];
		if (n === void 0) continue;
		if (n.text === void 0) {
			f.push({
				si: t,
				off: 0,
				ws: !1
			});
			continue;
		}
		let r = 0;
		for (let e of n.text) {
			let n = e.codePointAt(0);
			f.push({
				si: t,
				off: r,
				cp: n,
				ws: u(n)
			}), r++;
		}
	}
	let p = -1, m = -1;
	for (let e = 0; e < f.length; e++) f[e].ws || (p === -1 && (p = e), m = e);
	if (p === -1 || p === m) return null;
	let h = Array(f.length).fill(!1), g = 0;
	for (let e = p; e < m; e++) {
		let n = f[e];
		if (n.si === s) continue;
		if (n.ws) {
			h[e] = !0, g++;
			continue;
		}
		let i = f[e + 1];
		if (i.ws) continue;
		let a = n.cp, o = i.cp;
		(a !== void 0 && l(a) || o !== void 0 && l(o) || d && a !== void 0 && o !== void 0 && r(a) && r(o) && !t(o)) && (h[e] = !0, g++);
	}
	if (g === 0) return null;
	let _ = i / g;
	i < 0 && _ < c && (_ = c);
	let v = /* @__PURE__ */ new Map();
	for (let e of f) e.cp !== void 0 && v.set(e.si, (v.get(e.si) ?? 0) + 1);
	let y = /* @__PURE__ */ new Map();
	for (let e = 0; e < f.length; e++) {
		if (!h[e]) continue;
		let t = f[e], n = y.get(t.si);
		n || (n = {
			splitBefore: [],
			trailingGap: !1,
			internalStretch: 0
		}, y.set(t.si, n));
		let r = v.get(t.si) ?? 0;
		t.cp === void 0 || t.off === r - 1 ? n.trailingGap = !0 : (n.splitBefore.push(t.off + 1), n.internalStretch += _);
	}
	return {
		perGap: _,
		perSeg: y
	};
}
//#endregion
export { I as a, m as c, u as d, f, P as i, p as l, L as n, j as o, F as r, C as s, z as t, d as u };
