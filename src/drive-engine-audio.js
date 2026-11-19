const tau = 2 * Math.PI;

const v8Pulse = [1,.55,.78,.93,.67,.43,.99,.76];
const sixPulse = [1,.91,.97,.89,.99,.92];
const fourPulse = [1,.91,.98,.94];
const profiles = {
  sport:   { firing:v8Pulse, idle:760, redline:6500, top:44, gears:6, tone:590, intake:900, bite:.20, whine:4, drive:.028 },
  golf:    { firing:fourPulse, idle:870, redline:6200, top:47.5, gears:5, tone:580, intake:1160, bite:.43, whine:3, drive:.017 },
  jeep:    { firing:sixPulse, idle:690, redline:6000, top:32, gears:6, tone:510, intake:810, bite:.18, whine:3, drive:.030 },
  monster: { firing:[1,.47,.74,.94,.55,.35,.94,.64], idle:1050, redline:4900, top:30, gears:3, tone:445,
    intake:690, bite:.40, whine:9, drive:.087 },
  bike:    { firing:[1,.82], phase:[0,.375], idle:1190, redline:9800, top:48, gears:6, tone:880,
    intake:1540, bite:.48, whine:8, drive:.028 },
  tank:    { firing:[1,.81,.64,.97,.88,.69], idle:620, redline:2950, top:22, gears:3, tone:285,
    intake:480, bite:.19, whine:13, drive:.052, track:true },
  formula: { firing:sixPulse, idle:1780, redline:9750, top:53, gears:7, tone:1050,
    intake:1660, bite:.42, whine:8, drive:.054 },
  buggy:   { firing:[1,.76], phase:[0,.463], idle:1220, redline:7800, top:36, gears:5, tone:685,
    intake:1270, bite:.37, whine:5, drive:.025 },
  i6:      { firing:[1,.96,.92,.98,.93,.96], idle:810, redline:7200, top:52, gears:6, tone:690,
    intake:1220, bite:.32, whine:5, drive:.034 },
  v6:      { firing:sixPulse, idle:880, redline:7800, top:52, gears:6, tone:720,
    intake:1140, bite:.32, whine:5, drive:.037 },
  v8:      { firing:v8Pulse, idle:750, redline:6900, top:51, gears:6, tone:640,
    intake:1000, bite:.42, whine:4, drive:.028 },
  bigV8:   { firing:[1,.52,.67,.89,.65,.46,1,.65], idle:690, redline:5800, top:49, gears:5, tone:465,
    intake:825, bite:.33, whine:5, drive:.045 },
  v10:     { firing:[1,.79,.91,.97,.89,.96,.87,.96,.82,.95], idle:940, redline:8500, top:54, gears:6, tone:920,
    intake:1410, bite:.35, whine:6, drive:.043 },
  v12:     { firing:[1,.94,.98,.91,.98,.93,1,.92,.97,.94,.96,.91], idle:1000, redline:9150, top:55, gears:7, tone:985,
    intake:1540, bite:.41, whine:7, drive:.044 },
  electric: { firing:[], idle:780, redline:9450, top:53, gears:1, tone:1250,
    intake:1400, bite:0, whine:9, drive:.175 },
};

function getProfile(kind, setup) {
  if (kind === 'formula' && setup?.id === 'formula' && setup?.engineKey === 'v6') return profiles.formula;
  return profiles[setup?.engineKey] ?? profiles[kind] ?? profiles.sport;
}

function readRpm(profile, speed, loaded, setup) {
  const gears = profile.firing.length ? setup?.gears || profile.gears : 1;
  const travel = speed / (setup?.max ?? profile.top);
  const first = gears === 1 ? 1 : (gears <= 3 ? .39 : .27);
  const step = gears === 1 ? 1 : (1 - first) / (gears - 1);
  const gear = Math.min(gears - 1,Math.max(0,Math.ceil((travel - first) / step)));
  const limit = first + gear * step;
  const crank = profile.redline * Math.min(1.025, travel / limit);
  const launch = loaded && speed < 5 ? profile.redline * .15 * Math.exp(-speed * .48) : 0;
  return Math.max(profile.idle + launch,crank);
}

// Build one 720-degree crank cycle from individual cylinder pulses.
function cylinderWave(context, profile) {
  const real = new Float32Array(37);
  const imag = new Float32Array(37);
  const count = profile.firing.length;
  if (!count) imag[1] = .01;
  for (let harmonic = 1; harmonic < real.length; harmonic++) {
    const rolloff = 1 / (1 + (harmonic / (count * (1.7 + profile.bite))) ** 1.58);
    for (let i = 0; i < count; i++) {
      const phase = harmonic * (profile.phase?.[i] ?? i / count) * tau;
      const amplitude = profile.firing[i] * rolloff / count;
      real[harmonic] += Math.cos(phase) * amplitude;
      imag[harmonic] += Math.sin(phase) * amplitude;
    }
  }
  return context.createPeriodicWave(real,imag);
}

export function createEngineAudio(context, output, noise) {
  const bus = context.createGain();
  bus.gain.value = 0;
  bus.connect(output);
  const exhaust = context.createOscillator();
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = .71;
  const bass = context.createGain();
  exhaust.connect(lowpass).connect(bass).connect(bus);
  const manifold = context.createBiquadFilter();
  manifold.type = 'bandpass';
  manifold.Q.value = 1.25;
  const intake = context.createGain();
  exhaust.connect(manifold).connect(intake).connect(bus);
  const belt = context.createOscillator();
  belt.type = 'triangle';
  const beltLevel = context.createGain();
  belt.connect(beltLevel).connect(bus);
  const texture = context.createBufferSource();
  texture.buffer = noise;
  texture.loop = true;
  const air = context.createBiquadFilter();
  air.type = 'bandpass';
  const airLevel = context.createGain();
  texture.connect(air).connect(airLevel).connect(bus);
  exhaust.start();
  belt.start();
  texture.start();

  const waves = new Map();
  let active;
  let previewing = false;
  function choose(profile) {
    if (profile === active) return;
    if (!waves.has(profile)) waves.set(profile,cylinderWave(context,profile));
    exhaust.setPeriodicWave(waves.get(profile));
    active = profile;
  }

  const params = [exhaust.frequency,belt.frequency,lowpass.frequency,manifold.frequency,air.frequency,
    bass.gain,intake.gain,beltLevel.gain,airLevel.gain,bus.gain];
  function tone(profile, rpm, speed, loaded, setup, when, smoothing) {
    const rev = Math.min(1.05, rpm / profile.redline);
    const combustion = profile.firing.length > 0;
    const boost = setup?.induction === 'supercharger' ? .092 : setup?.induction === 'turbo' ? .054 : 0;
    const values = [
      rpm / 120, Math.max(35,rpm / 60 * (profile.whine + boost * 42)),
      profile.tone * (.72 + rev * 1.57 + (loaded ? .38 : 0)),
      profile.intake * (.65 + rev * .68),
      profile.track ? 150 + speed * 31 : 330 + rpm * .14 + speed * 10,
      combustion ? (loaded ? .67 : .46) : 0,
      combustion ? profile.bite * (loaded ? .56 : .21) : 0,
      (profile.drive + boost) * (loaded ? .31 + rev*.80 : .17 + rev*.35),
      (profile.track ? .024 + speed*.0031 : .012 + speed*.00085) + (loaded ? .025+boost*.41 : 0),
      loaded ? .196 + rev*.12 : .107 + rev*.082,
    ];
    for (let i = 0; i < values.length; i++) params[i].setTargetAtTime(values[i],when,smoothing);
  }

  function stopPreview(now) {
    if (!previewing) return;
    for (const param of params) param.cancelScheduledValues(now);
    previewing = false;
  }

  function update(kind, speed = 0, loaded = false, setup) {
    const now = context.currentTime;
    stopPreview(now);
    if (!kind) {
      bus.gain.setTargetAtTime(0,now,.075);
      return;
    }
    const profile = getProfile(kind,setup);
    choose(profile);
    const rpm = readRpm(profile,speed,loaded,setup);
    const idleVariation = Math.sin(now * 23.8) * profile.idle * .012 * Math.exp(-speed * .42);
    tone(profile,rpm + idleVariation,speed,loaded,setup,now,speed < 1 ? .13 : .085);
  }

  function preview(setup) {
    const now = context.currentTime;
    stopPreview(now);
    const profile = getProfile(setup?.id,setup);
    choose(profile);
    previewing = true;
    tone(profile,profile.idle,0,false,setup,now,.06);
    tone(profile,profile.redline*.83,0,true,setup,now+.23,.24);
    tone(profile,profile.idle*1.03,0,false,setup,now+.89,.14);
    bus.gain.setTargetAtTime(0,now+1.29,.085);
  }

  return { update, preview };
}
