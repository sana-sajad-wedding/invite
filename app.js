(() => {
  const C = window.INVITE, $ = id => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  const guest = (q.get('to') || '').replace(/_/g, ' ').trim().slice(0, 60) || C.envelope.defaultGuest;
  const group = C.groups[q.get('g')] || C.groups[C.defaultGroup];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- content ----------
  const el = (tag, cls, txt) => { const e = document.createElement(tag); e.className = cls; if (txt != null) e.textContent = txt; return e; };
  document.title = C.title;
  $('addrLabel').textContent = C.envelope.label;
  $('addrName').append(el('span', 'ln', guest));

  const text = $('text');
  text.appendChild(el('p', 'bism')).append(el('span', 'ln', C.bismillah));
  const paras = text.appendChild(el('div', 'paras'));
  for (const para of C.paragraphs) {
    const p = paras.appendChild(el('p', 'para'));
    for (const line of para) p.append(el('span', 'ln', line));
  }
  text.appendChild(el('p', 'fam')).append(el('span', 'ln', C.families));

  $('rear').append(el('p', 'r-date', C.date), el('p', 'r-time', C.timeLine.replace('{t}', group)), el('i', 'r-rule'),
    el('p', 'r-venue', C.venue), el('p', 'r-addr', C.address));
  const mapBtn = $('mapBtn');
  mapBtn.append(el('span', '', C.ui.map), ...C.maps.map(m => Object.assign(el('a', '', m.label), { href: m.url, target: '_blank', rel: 'noopener' })));
  $('replay').setAttribute('aria-label', C.ui.replay);

  // ---------- helpers ----------
  const OUT = 'cubic-bezier(.2,.7,.2,1)', INOUT = 'cubic-bezier(.6,0,.3,1)';
  const wait = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms));
  // animate to keyframe(s), then bake the end state into inline style
  const to = (node, kf, ms, easing = OUT) => {
    const a = node.animate(kf, { duration: reduced ? 0 : ms, easing, fill: 'forwards' });
    return a.finished.then(() => { try { a.commitStyles(); a.cancel(); } catch { /* element already hidden: keep the filled end state */ } });
  };
  const ink = (ln, ms) => {
    if (reduced) { ln.classList.add('on'); return Promise.resolve(); }
    const a = ln.animate({ '--p': ['0%', '130%'] }, { duration: ms, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'forwards' });
    return a.finished.then(() => { ln.classList.add('on'); a.cancel(); });
  };
  const hint = $('hint'), say = t => { hint.textContent = t || ''; hint.classList.toggle('on', !!t); };

  // ---------- sound ----------
  // Each paper move plays a real recording if the config names one (sfx: { flap: 'assets/…' }),
  // otherwise a synthesised stand-in: sparse crackle grains (the crinkle) over a soft friction hiss (the slide).
  let ac, muted = false, music;
  //            seconds, crackles/sec, hiss level, volume
  const PAPER = {
    turn:   [.45,  25, .50, .07],
    flap:   [.90,  90, .25, .13],
    slide:  [1.10, 12, .70, .08],
    unfold: [1.00, 140, .20, .14],
    flip:   [.50,  30, .50, .07],
  };
  function sfx(name) {
    if (muted || reduced) return;
    const file = C.sfx && C.sfx[name];
    if (file) { const a = new Audio(file); a.volume = .6; a.play().catch(() => {}); return; }
    try {
      ac ??= new (window.AudioContext || window.webkitAudioContext)();
      const [dur, rate, hiss, vol] = PAPER[name], sr = ac.sampleRate, n = sr * dur | 0;
      const buf = ac.createBuffer(1, n, sr), d = buf.getChannelData(0);
      let grain = 0, decay = 0, wob = 1;
      for (let i = 0; i < n; i++) {
        const env = Math.sin(Math.PI * i / n) ** 1.3, w = Math.random() * 2 - 1;
        if (Math.random() < rate * env / sr) { grain = .4 + Math.random() * .6; decay = Math.exp(-1 / (sr * (.001 + Math.random() * .004))); }
        if (i % 400 === 0) wob = .5 + Math.random() * .5;         // uneven hand pressure
        d[i] = w * grain + w * hiss * .25 * env * wob;
        grain *= decay;
      }
      const src = ac.createBufferSource(), hp = ac.createBiquadFilter(), pk = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = buf; hp.type = 'highpass'; hp.frequency.value = 1100;
      pk.type = 'peaking'; pk.frequency.value = 4500; pk.Q.value = .8; pk.gain.value = 6; g.gain.value = vol;
      src.connect(hp).connect(pk).connect(g).connect(ac.destination); src.start();
    } catch { /* no audio: fine */ }
  }
  $('mute').addEventListener('click', e => {
    e.stopPropagation(); muted = !muted; e.currentTarget.setAttribute('aria-pressed', muted);
    if (music) music.muted = muted;
  });

  // ---------- scenes ----------
  const env = $('env'), flap = $('flap'), seal = $('seal'), shell = $('shell'),
    cardPos = $('cardPos'), card = $('card'), fold = $('fold');
  const fx = reduced ? { burst() {}, scatter() {} } : Burst.start([$('fxFar'), $('fx'), $('fxNear')], [1, 2, 3].map(n => `assets/butterfly-${n}.webp`), [1, 2, 3, 4].map(n => `assets/petal-${n}.webp`));
  const envT = (y, ry, rz) => `translateY(${y}) translateZ(0) rotateY(${ry}deg) rotateZ(${rz}deg)`;
  let s, H, EH;                       // card scale inside pocket, card height, envelope height
  const pos = (y, sc) => `translateZ(3px) translateY(${y}px) scale(${sc})`;
  const inPocket = () => s * H / 4 + .03 * EH;
  function measure() {
    H = cardPos.offsetHeight; EH = env.offsetHeight; s = .66 * env.offsetWidth / cardPos.offsetWidth;
    if (state === 'address' || state === 'sealed') cardPos.style.transform = pos(inPocket(), s);
    const nm = $('addrName'); nm.style.fontSize = '';             // shrink long guest names to fit the envelope
    const fit = .8 * env.offsetWidth / nm.firstChild.scrollWidth;
    if (fit < 1) nm.style.fontSize = parseFloat(getComputedStyle(nm).fontSize) * fit + 'px';
  }

  let state = 'address', busy = false;

  async function turnOver() {
    say(''); sfx('turn');
    await to(env, [
      { transform: envT('0', 0, -3) },
      { transform: 'translateY(0) translateZ(140px) rotateY(95deg) rotateZ(-2deg)', offset: .5 },
      { transform: envT('0', 180, 0) }], 1300, INOUT);
    cardPos.style.visibility = '';
    state = 'sealed'; say(C.ui.hintOpen);
  }

  async function open() {
    say('');
    // seal lifts off
    await to(seal, { transform: 'translateZ(60px) translate(10%,-5%) rotate(16deg) scale(1.12)', opacity: 0 }, 480);
    // flap swings open on its top hinge while the envelope settles lower
    sfx('flap');
    to(env, { transform: envT('7svh', 180, 0) }, 1100);
    setTimeout(() => {
      const r = env.getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height * .32, r.width * .3);
    }, reduced ? 0 : 750);
    await to(flap, { transform: 'translateZ(16px) rotateX(180deg)' }, 1500, INOUT);
    flap.style.transform = 'translateZ(1px) rotateX(180deg)';   // open flap now sits behind the card
    await wait(700);
    // card slides up out of the pocket
    sfx('slide');
    await to(cardPos, { transform: pos(inPocket() - .95 * EH, s) }, 1500, INOUT);
    // envelope falls away, card comes forward (still folded)
    to(shell, { transform: 'translateY(70svh) rotateZ(7deg)', opacity: 0 }, 900, 'cubic-bezier(.5,0,.9,.4)').then(() => shell.hidden = true);
    to(env, { transform: envT('0', 180, 0) }, 1000, INOUT);
    await to(cardPos, { transform: pos(H / 4, 1) }, 1000, INOUT);
    await wait(150);
    // unfold on the middle crease
    sfx('unfold');
    to($('shade'), { opacity: 0 }, 1200, 'ease-in');
    to(cardPos, { transform: pos(0, 1) }, 1200, INOUT);
    await to(fold, [
      { transform: 'rotateX(179.6deg)' },
      { transform: 'rotateX(-7deg)', offset: .82 },
      { transform: 'rotateX(0deg)' }], 1300, INOUT);
    $('hb').hidden = true;
    to($('crease'), { opacity: 1 }, 400);
    // ink in, line by line
    for (const ln of text.querySelectorAll('.ln')) {
      const head = ln.parentNode.className !== 'para';
      ink(ln, head ? 2600 : 2400);
      await wait(head ? 2300 : 1700);
    }
    await wait(500);
    state = 'open'; say(C.ui.hintFlip);
    $('replay').hidden = false;
  }

  async function flip() {
    say(''); sfx('flip');
    const back = card.classList.toggle('flipped');
    mapBtn.classList.remove('on');
    await wait(1200);
    mapBtn.classList.toggle('on', back);
  }

  async function act() {
    if (busy) return; busy = true;
    // music starts on the guest's first tap (browsers block sound before that)
    if (C.music && !music) { music = new Audio(C.music); music.loop = true; music.volume = .35; music.muted = muted; music.play().catch(() => {}); }
    try {
      if (state === 'address') await turnOver();
      else if (state === 'sealed') await open();
      else if (state === 'open') await flip();
    } finally { busy = false; }
  }
  env.addEventListener('click', act);
  env.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
  $('replay').addEventListener('click', () => location.reload());
  document.addEventListener('visibilitychange', () => { if (music) document.hidden ? music.pause() : music.play().catch(() => {}); });
  addEventListener('pointerdown', e => fx.scatter(e.clientX, e.clientY));
  addEventListener('resize', measure);

  // ---------- tilt: mouse on desktop, gyro where no permission prompt is needed ----------
  // ponytail: iOS needs DeviceOrientationEvent.requestPermission() (a system popup) — skipped; add if clients ask.
  const tilt = $('tilt'), setTilt = (x, y) => { if (state === 'open') tilt.style.transform = `rotateX(${-y * 5}deg) rotateY(${x * 6}deg)`; };
  if (!reduced) {
    addEventListener('pointermove', e => { if (e.pointerType === 'mouse') setTilt(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); });
    if (window.DeviceOrientationEvent && !DeviceOrientationEvent.requestPermission)
      addEventListener('deviceorientation', e => setTilt(Math.max(-1, Math.min(1, (e.gamma || 0) / 30)), Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 30))));
  }

  // ---------- start ----------
  const imgs = ['env-front.webp', 'env-pocket.webp', 'env-flap-out.webp', 'env-flap-in.webp', 'env-liner.webp', 'seal.webp', 'card.webp', 'card-outside.webp', 'butterfly-1.webp', 'butterfly-2.webp', 'butterfly-3.webp'].map(n => { const i = new Image(); i.src = 'assets/' + n; return new Promise(r => { i.onload = i.onerror = r; }); });
  const ready = Promise.all([document.fonts.load('1em Nast', guest), document.fonts.load('1em Mirza', 'آ'), document.fonts.load('1em Sols', 'آ'), ...imgs]);
  Promise.race([ready, new Promise(r => setTimeout(r, 20000))]).catch(() => {}).then(async () => {
    measure();
    cardPos.style.visibility = 'hidden';            // its back would peek out under the address side
    document.body.classList.remove('loading');
    await wait(700);
    await ink($('addrName').firstChild, 2200);
    say(C.ui.hintTurn);
  });
})();
