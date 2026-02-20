// ─── Game Audio Module ────────────────────────────────────────────────────────
// All sounds generated procedurally via Web Audio API — no external files.
const GameAudio = (() => {

  let ctx = null;
  let masterGain, sfxBus, musicBus, delayBus;
  let loopTimer = null;
  let initialized = false;

  // ─── Music definition ───────────────────────────────────────────────────────
  const BPM       = 120;
  const BEAT      = 60 / BPM;     // 0.5 s per beat
  const LOOP_BEATS = 16;
  const LOOP_DUR   = LOOP_BEATS * BEAT;  // 8 seconds

  // [frequency_hz, duration_in_beats]
  // G-major pentatonic flavour, two 8-beat phrases
  const MELODY = [
    // Phrase A
    [392, 1], [440, 1], [494, 1], [587, 1],  // G4 A4 B4 D5
    [494, 1], [440, 1], [392, 2],             // B4 A4 G4──
    // Phrase B
    [330, 1], [392, 1], [440, 1], [494, 1],  // E4 G4 A4 B4
    [440, 1], [392, 1], [330, 2],             // A4 G4 E4──
  ];

  // Root + fifth power-chord pads
  const PADS = [
    [[196, 294], 4],   // G3 + D4  (bar 1 — G major)
    [[147, 220], 4],   // D3 + A3  (bar 2 — D major)
    [[131, 196], 2],   // C3 + G3  (bar 3a — C major)
    [[147, 220], 2],   // D3 + A3  (bar 3b — D major)
    [[196, 294], 4],   // G3 + D4  (bar 4 — G major)
  ];

  // Single bass note per bar
  const BASS = [
    [98,  4],   // G2
    [73,  4],   // D2
    [65,  2],   // C2
    [73,  2],   // D2
    [98,  4],   // G2
  ];

  // ─── Core note player ────────────────────────────────────────────────────────
  function playNote(freq, startTime, durSec, type, vol, dest, vibrato = false) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type            = type;
    osc.frequency.value = freq;

    // Slight vibrato for melody expressiveness
    if (vibrato) {
      const lfo     = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value  = 5.5;
      lfoGain.gain.value   = freq * 0.012;
      lfo.type             = 'sine';
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(startTime + 0.08);
      lfo.stop(startTime + durSec);
    }

    const atk = 0.025;
    const rel = Math.min(0.12, durSec * 0.18);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + atk);
    gain.gain.setValueAtTime(vol, startTime + durSec - rel);
    gain.gain.linearRampToValueAtTime(0, startTime + durSec);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + durSec + 0.05);
  }

  // ─── Music scheduler ─────────────────────────────────────────────────────────
  function scheduleLoop(startTime) {
    // Melody (triangle + vibrato)
    let t = startTime;
    for (const [freq, beats] of MELODY) {
      playNote(freq, t, beats * BEAT * 0.88, 'triangle', 0.55, delayBus, true);
      t += beats * BEAT;
    }

    // Bass (sine, very smooth)
    t = startTime;
    for (const [freq, beats] of BASS) {
      playNote(freq, t, beats * BEAT * 0.7, 'sine', 0.65, musicBus);
      t += beats * BEAT;
    }

    // Pad chords (sine, gentle, sent to delay for atmosphere)
    t = startTime;
    for (const [freqs, beats] of PADS) {
      for (const freq of freqs) {
        playNote(freq, t, beats * BEAT * 0.85, 'sine', 0.12, delayBus);
      }
      t += beats * BEAT;
    }

    // Schedule next iteration slightly before the current one ends
    const msUntilNext = (startTime + LOOP_DUR - ctx.currentTime - 0.4) * 1000;
    loopTimer = setTimeout(() => scheduleLoop(startTime + LOOP_DUR), Math.max(50, msUntilNext));
  }

  // ─── Noise buffer helper ─────────────────────────────────────────────────────
  function makeNoiseBuffer(durSec) {
    const size = Math.floor(ctx.sampleRate * durSec);
    const buf  = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ─── Public init ─────────────────────────────────────────────────────────────
  function init() {
    if (initialized) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    initialized = true;

    ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();

    // Compressor at the end of the chain
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value     = 5;
    comp.attack.value    = 0.003;
    comp.release.value   = 0.25;
    comp.connect(ctx.destination);

    masterGain = ctx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(comp);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.55;
    sfxBus.connect(masterGain);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.28;
    musicBus.connect(masterGain);

    // Delay/echo for the melody and pads
    const delay    = ctx.createDelay(1.0);
    delay.delayTime.value = BEAT * 0.75;   // dotted-eighth echo in tempo
    const feedback = ctx.createGain();
    feedback.gain.value = 0.22;
    const wetGain  = ctx.createGain();
    wetGain.gain.value = 0.18;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(musicBus);

    delayBus = ctx.createGain();
    delayBus.gain.value = 1.0;
    delayBus.connect(musicBus);
    delayBus.connect(delay);

    scheduleLoop(ctx.currentTime + 0.15);
  }

  // ─── Fade music out (game over) ───────────────────────────────────────────
  function fadeMusicOut() {
    if (!ctx) return;
    musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);
  }

  function fadeMusicIn() {
    if (!ctx) return;
    musicBus.gain.setValueAtTime(0, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 1.5);
  }

  // ─── SFX: sword swing (whoosh) ────────────────────────────────────────────
  function playSwordSwing() {
    if (!ctx) return;
    const t = ctx.currentTime;

    const src    = ctx.createBufferSource();
    src.buffer   = makeNoiseBuffer(0.22);

    const filter = ctx.createBiquadFilter();
    filter.type  = 'bandpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(700, t + 0.18);
    filter.Q.value = 1.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.22);

    src.connect(filter); filter.connect(gain); gain.connect(sfxBus);
    src.start(t); src.stop(t + 0.22);
  }

  // ─── SFX: sword hits enemy ────────────────────────────────────────────────
  function playHit(isTroll) {
    if (!ctx) return;
    const t    = ctx.currentTime;
    const base = isTroll ? 100 : 280;

    // Descending sawtooth thud
    const osc  = ctx.createOscillator();
    osc.type   = 'sawtooth';
    osc.frequency.setValueAtTime(base * 2.2, t);
    osc.frequency.exponentialRampToValueAtTime(base * 0.45, t + (isTroll ? 0.18 : 0.12));

    // Short noise punch
    const nSrc  = ctx.createBufferSource();
    nSrc.buffer = makeNoiseBuffer(0.06);
    const nFilt = ctx.createBiquadFilter();
    nFilt.type  = 'highpass';
    nFilt.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(isTroll ? 0.7 : 0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isTroll ? 0.2 : 0.14));

    osc.connect(gain);
    nSrc.connect(nFilt); nFilt.connect(gain);
    gain.connect(sfxBus);
    osc.start(t); osc.stop(t + 0.22);
    nSrc.start(t); nSrc.stop(t + 0.08);
  }

  // ─── SFX: goblin dies ─────────────────────────────────────────────────────
  function playGoblinDeath() {
    if (!ctx) return;
    const t = ctx.currentTime;

    // High squeak descending to a low pop
    const osc = ctx.createOscillator();
    osc.type  = 'square';
    osc.frequency.setValueAtTime(720, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.32);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);

    osc.connect(gain); gain.connect(sfxBus);
    osc.start(t); osc.stop(t + 0.35);
  }

  // ─── SFX: troll dies ──────────────────────────────────────────────────────
  function playTrollDeath() {
    if (!ctx) return;
    const t = ctx.currentTime;

    // Deep rumbling growl — three oscillators detuned
    [[180, 1], [270, 0.6], [360, 0.4]].forEach(([freq, vol]) => {
      const osc = ctx.createOscillator();
      osc.type  = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.22, t + 0.75);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      osc.connect(gain); gain.connect(sfxBus);
      osc.start(t); osc.stop(t + 0.8);
    });

    // Low body thump
    const thump = ctx.createOscillator();
    thump.type  = 'sine';
    thump.frequency.setValueAtTime(90, t);
    thump.frequency.exponentialRampToValueAtTime(30, t + 0.25);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.7, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    thump.connect(tg); tg.connect(sfxBus);
    thump.start(t); thump.stop(t + 0.3);
  }

  // ─── SFX: player takes damage ─────────────────────────────────────────────
  function playPlayerHit() {
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type  = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.35);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc.connect(gain); gain.connect(sfxBus);
    osc.start(t); osc.stop(t + 0.4);
  }

  // ─── SFX: coin pickup ─────────────────────────────────────────────────────
  function playCoinPickup() {
    if (!ctx) return;
    const t = ctx.currentTime;

    [880, 1108, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type  = 'sine';
      osc.frequency.value = freq;

      const gain  = ctx.createGain();
      const start = t + i * 0.055;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.28, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

      osc.connect(gain); gain.connect(sfxBus);
      osc.start(start); osc.stop(start + 0.2);
    });
  }

  // ─── SFX: game over ───────────────────────────────────────────────────────
  function playGameOver() {
    if (!ctx) return;
    const t = ctx.currentTime;

    fadeMusicOut();

    // Sad descending scale: A-G-F-E-D-C-B-A
    const sadNotes = [440, 392, 349, 330, 294, 261, 247, 220];
    sadNotes.forEach((freq, i) => {
      const osc1 = ctx.createOscillator(); osc1.type = 'sine';
      const osc2 = ctx.createOscillator(); osc2.type = 'triangle';
      osc1.frequency.value = freq;
      osc2.frequency.value = freq / 2;

      const gain  = ctx.createGain();
      const start = t + i * 0.28;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.32, start + 0.04);
      gain.gain.setValueAtTime(0.32, start + 0.18);
      gain.gain.linearRampToValueAtTime(0, start + 0.36);

      osc1.connect(gain); osc2.connect(gain); gain.connect(sfxBus);
      osc1.start(start); osc1.stop(start + 0.38);
      osc2.start(start); osc2.stop(start + 0.38);
    });

    // Final low minor chord
    const finalT = t + sadNotes.length * 0.28 + 0.1;
    [110, 131, 165].forEach(freq => {
      const osc  = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28, finalT);
      gain.gain.linearRampToValueAtTime(0, finalT + 2.2);
      osc.connect(gain); gain.connect(sfxBus);
      osc.start(finalT); osc.stop(finalT + 2.3);
    });
  }

  function playHeal() {
    if (!ctx) return;
    const t = ctx.currentTime;
    // Warm ascending arpeggio: C4 – E4 – G4 – C5
    [261.6, 329.6, 392.0, 523.2].forEach((freq, i) => {
      const osc  = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const st   = t + i * 0.11;
      gain.gain.setValueAtTime(0,    st);
      gain.gain.linearRampToValueAtTime(0.32, st + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.55);
      osc.connect(gain); gain.connect(sfxBus);
      osc.start(st); osc.stop(st + 0.6);
      // Soft harmonic layer
      const osc2 = ctx.createOscillator(); osc2.type = 'triangle';
      osc2.frequency.value = freq * 2;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0,    st);
      g2.gain.linearRampToValueAtTime(0.1, st + 0.06);
      g2.gain.exponentialRampToValueAtTime(0.001, st + 0.35);
      osc2.connect(g2); g2.connect(sfxBus);
      osc2.start(st); osc2.stop(st + 0.4);
    });
  }

  return {
    init,
    fadeMusicIn,
    playSwordSwing,
    playHit,
    playGoblinDeath,
    playTrollDeath,
    playPlayerHit,
    playCoinPickup,
    playGameOver,
    playHeal,
  };

})();
