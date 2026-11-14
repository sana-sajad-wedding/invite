// Canvas butterflies + petals on three depth layers, like a camera with shallow focus:
//   far  — small, slow, soft, drawn BEHIND the card
//   mid  — in focus, in front of the card
//   near — few, big, fast, blurred (close to the lens)
// Burst.start([farCanvas, midCanvas, nearCanvas], [butterflyUrls], [petalUrls]) → { burst(x,y), scatter(x,y) }
window.Burst = {
  start(canvases, flyUrls, petalUrls) {
    const load = u => { const i = new Image(); i.src = u; return i; };
    const flyImgs = flyUrls.map(load), petalImgs = petalUrls.map(load);
    const R = (a, b) => a + Math.random() * (b - a);
    //            size, speed, opacity
    const DEPTH = [[.55, .6, .85], [1, 1, 1], [1.9, 1.5, .9]];
    const L = canvases.map(c => c.getContext('2d'));
    const layer = () => { const r = Math.random(); return r < .4 ? 0 : r < .9 ? 1 : 2; };
    const AMBIENT = [1, 0, 1, 0, 2, 1, 0];     // layers of the butterflies that stay for the whole visit
    let W, H, flies = [], petals = [], last = 0, nextPetal = 0;

    const resize = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      canvases.forEach((c, i) => { c.width = W * d; c.height = H * d; L[i].setTransform(d, 0, 0, d, 0, 0); });
    };
    resize(); addEventListener('resize', resize);

    const petal = (x, y, vx, vy, l = layer()) => petals.push({
      x, y, vx, vy, l, s: R(7, 13), rot: R(0, 6.3), vr: R(-.03, .03), tum: R(0, 6.3), vt: R(.02, .06),
      sway: R(0, 6.3), age: 0, img: petalImgs[Math.random() * petalImgs.length | 0],
    });

    // things leave the envelope a few at a time over ~4s, fanning out wide
    function burst(x, y, spread = 40, n = 22) {
      for (let i = 0; i < n; i++) setTimeout(() => {
        flies.push({ x: x + R(-spread, spread), y, dir: -Math.PI / 2 + R(-1.2, 1.2), spd: R(3, 6.5), cruise: R(.5, 1.1), turn: 0,
          s: R(22, 46), ph: R(0, 6.3), fl: R(.07, .2), l: i < AMBIENT.length ? AMBIENT[i] : layer(), stay: i < AMBIENT.length, age: 0,
          img: flyImgs[i % flyImgs.length] });
      }, i / n * 3600 + R(0, 400));
      for (let i = 0; i < n * 1.6; i++) setTimeout(() => {
        const a = -Math.PI / 2 + R(-1.3, 1.3), v = R(2.5, 7.5);
        petal(x + R(-spread, spread), y, Math.cos(a) * v, Math.sin(a) * v);
      }, R(0, 4000));
    }

    // a tap sends nearby butterflies away from the finger
    function scatter(x, y) {
      for (const f of flies) {
        const dx = f.x - x, dy = f.y - y;
        if (Math.hypot(dx, dy) < 170) { f.dir = Math.atan2(dy, dx); f.spd = 6; }
      }
    }

    function frame(t) {
      const k = Math.min((t - last) / 16.7, 3) || 1; last = t;
      for (const c of L) c.clearRect(0, 0, W, H);

      if (t > nextPetal && petals.length < 40) { petal(R(0, W), -20, R(-.3, .3), R(.4, 1)); nextPetal = t + R(700, 1500); }
      petals = petals.filter(p => p.y < H + 40 && p.x > -50 && p.x < W + 50);
      for (const p of petals) {
        const [sc, sp, al] = DEPTH[p.l], ctx = L[p.l];
        p.age += k; p.vy += .03 * k; p.vx *= .985; p.vy = Math.min(p.vy * .985, 1.2);
        p.sway += .03 * k; p.x += (p.vx + Math.sin(p.sway) * .6) * sp * k; p.y += p.vy * sp * k;
        p.rot += p.vr * k; p.tum += p.vt * k;
        if (!p.img.complete) continue;
        const s = p.s * sc * Math.min(1, .3 + p.age / 30);      // grows as it leaves the envelope
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, .35 + .65 * Math.abs(Math.cos(p.tum)));
        ctx.globalAlpha = al * .92; ctx.drawImage(p.img, -s, -s, s * 2, s * 2); ctx.restore();
      }

      flies = flies.filter(f => f.stay || (f.x > -90 && f.x < W + 90 && f.y > -90 && f.y < H + 90));
      for (const f of flies) {
        const [sc, sp, al] = DEPTH[f.l], ctx = L[f.l];
        f.age += k;
        // a butterfly always flies forward along its heading and only turns gradually:
        // no hovering in place, so no spinning on the spot
        f.turn = (f.turn + R(-.006, .006) * k) * .95;
        if (f.stay && (f.x < 50 || f.x > W - 50 || f.y < 60 || f.y > H - 60)) {   // near an edge: bank back towards the middle
          let d = Math.atan2(H / 2 - f.y, W / 2 - f.x) - f.dir;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          f.dir += Math.max(-.035, Math.min(.035, d)) * k;
        } else f.dir += f.turn * k;
        f.spd += (f.cruise - f.spd) * .025 * k;
        f.x += Math.cos(f.dir) * f.spd * sp * k; f.y += Math.sin(f.dir) * f.spd * sp * k; f.ph += f.fl * k;
        const img = f.img; if (!img.complete) continue;
        const wing = .18 + .82 * Math.abs(Math.sin(f.ph)), s = f.s * sc * Math.min(1, .35 + f.age / 40), hw = img.width / 2;
        ctx.save(); ctx.translate(f.x, f.y + Math.sin(f.ph) * 1.5);
        ctx.rotate(f.dir + Math.PI / 2);
        ctx.globalAlpha = al * Math.min(1, f.age / 8);
        ctx.scale(wing, 1);
        ctx.drawImage(img, 0, 0, hw, img.height, -s / 2, -s / 2, s / 2, s);
        ctx.drawImage(img, hw, 0, hw, img.height, 0, -s / 2, s / 2, s);
        ctx.restore();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return { burst, scatter };
  },
};
