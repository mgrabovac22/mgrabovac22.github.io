import { createEngineAudio } from './drive-engine-audio.js';

export function createDriveAudio() {
  let context;
  let master;
  let engineAudio;
  let noise;
  let volume = .17;
  let muted = false;

  function configure(level = volume, silent = muted) {
    volume = level;
    muted = silent;
    if (master) master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, .05);
  }

  function unlock() {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!context) {
        context = new Audio();
        master = context.createGain();
        master.gain.value = muted ? 0 : volume;
        master.connect(context.destination);
        noise = context.createBuffer(1, context.sampleRate * .5, context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        engineAudio = createEngineAudio(context,master,noise);
      }
      if (context.state === 'suspended') void context.resume().catch(() => {});
    } catch {
      // The game remains playable where Web Audio is unavailable.
    }
  }

  const sounds = {
    click: [580, 320, .065, .14], footstep: [160, 80, .10, .20, true],
    splash: [2100, 500, .17, .33, true], firework: [360, 920, .42, .12],
    pop: [1200, 140, .46, .45, true], bubble: [410, 700, .16, .16],
    confetti: [1600, 460, .19, .22, true], pulse: [260, 68, .26, .22],
    pickup: [450, 850, .24, .18], blast: [560, 95, .40, .45, true],
  };

  function play(name) {
    if (!master || context.state !== 'running' || muted) return;
    const [start, end, time, strength, textured] = sounds[name];
    const now = context.currentTime;
    const gain = context.createGain();
    const voice = textured ? context.createBufferSource() : context.createOscillator();
    const filter = textured ? context.createBiquadFilter() : null;
    if (filter) {
      voice.buffer = noise;
      filter.type = 'lowpass';
      voice.connect(filter).connect(gain);
    } else voice.connect(gain);
    const pitch = (filter ?? voice).frequency;
    pitch.setValueAtTime(start, now);
    pitch.exponentialRampToValueAtTime(end, now + time);
    gain.gain.setValueAtTime(strength, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + time);
    gain.connect(master);
    voice.start(now);
    voice.stop(now + time);
  }

  function engine(kind, speed = 0, power = false, setup) {
    engineAudio?.update(kind,speed,power,setup);
  }

  function previewEngine(setup) {
    unlock();
    if (!muted) engineAudio?.preview(setup);
  }

  return { unlock, configure, play, engine, previewEngine };
}
