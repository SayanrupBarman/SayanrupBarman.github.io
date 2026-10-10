/**
 * Web Audio sound board.
 *
 * Files are fetched and decoded during loading with an OfflineAudioContext,
 * which needs no user gesture; the audible AudioContext is created on the
 * visitor's first interaction (browsers keep audio locked until then), so
 * even the very first cut is heard. Missing or broken sounds are skipped
 * with a warning; the experience never depends on audio.
 */

const MUTE_KEY = 'parcel:muted';

export function createSound({ files, storage }) {
  let ctx = null;
  let master = null;
  let muted = Boolean(storage.get(MUTE_KEY, false));
  const raw = new Map();
  const buffers = new Map();
  const loops = new Map();
  const muteListeners = new Set();

  let offline = null;
  const offlineDecoder = () => {
    const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!offline && Offline) offline = new Offline(1, 1, 44100);
    return offline;
  };

  const fetchOne = async (name, url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.arrayBuffer();
      const decoder = offlineDecoder();
      // AudioBuffers are not tied to a context, so early-decoded ones play later.
      if (decoder) buffers.set(name, await decoder.decodeAudioData(data));
      else raw.set(name, data);
    } catch (err) {
      console.warn(`[parcel] sound "${name}" (${url}) could not be loaded:`, err.message);
    }
  };

  const decodeAll = () => {
    for (const [name, data] of raw) {
      ctx.decodeAudioData(data.slice(0))
        .then((buffer) => buffers.set(name, buffer))
        .catch((err) => console.warn(`[parcel] sound "${name}" could not be decoded:`, err.message));
    }
  };

  /** Fetch every sound file. Resolves even if some fail. */
  const prefetch = () => Object.entries(files).map(([name, url]) => fetchOne(name, url));

  /** Call from any user gesture; safe to call repeatedly. */
  const unlock = () => {
    if (!ctx) {
      const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioCtor) return;
      ctx = new AudioCtor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
      decodeAll();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch((err) => console.warn('[parcel] audio could not start yet:', err.message));
    }
  };

  const play = (name, { volume = 1, rate = 1, delay = 0 } = {}) => {
    const buffer = buffers.get(name);
    if (!ctx || !buffer || ctx.state !== 'running') return;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    gain.gain.value = volume;
    source.connect(gain).connect(master);
    source.start(ctx.currentTime + delay);
  };

  /** Start (or keep) a seamless loop at a level between 0 and 1. */
  const loop = (name, level = 1) => {
    const buffer = buffers.get(name);
    if (!ctx || !buffer || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const existing = loops.get(name);
    if (existing) {
      existing.gain.gain.setTargetAtTime(level, now, 0.03);
      return;
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.setValueAtTime(0, now);
    gain.gain.setTargetAtTime(level, now, 0.02);
    source.connect(gain).connect(master);
    source.start(now, Math.random() * buffer.duration);
    loops.set(name, { source, gain });
  };

  const stopLoop = (name) => {
    const active = loops.get(name);
    if (!active) return;
    loops.delete(name);
    const now = ctx.currentTime;
    active.gain.gain.cancelScheduledValues(now);
    active.gain.gain.setTargetAtTime(0, now, 0.025);
    active.source.stop(now + 0.15);
  };

  const setMuted = (value) => {
    muted = Boolean(value);
    storage.set(MUTE_KEY, muted);
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
    muteListeners.forEach((fn) => fn(muted));
  };

  return {
    prefetch,
    unlock,
    play,
    loop,
    stopLoop,
    setMuted,
    isMuted: () => muted,
    onMuteChange: (fn) => { muteListeners.add(fn); return () => muteListeners.delete(fn); },
    /** For tests and debugging. */
    status: () => ({ context: ctx?.state ?? 'none', muted, loops: [...loops.keys()], decoded: [...buffers.keys()] }),
  };
}
