/** Original percussion synthesis plus locally hosted CC0 impact/announcer samples. */
export type SoundCue =
  | "select"
  | "jab"
  | "heavy"
  | "block"
  | "parry"
  | "feint"
  | "hurt"
  | "bell"
  | "win"
  | "lose"
  | "recover"
  | "miss"
  | "charge"
  | "victory"
  | "fight"
  | "round1"
  | "round2"
  | "round3";
export class FightAudio {
  private samples = new Map<string, AudioBuffer>();
  private samplesStarted = false;
  private loading: Promise<unknown> | null = null;
  private loadSamples() {
    if (this.samplesStarted || !this.ctx) return;
    this.samplesStarted = true;
    const ctx = this.ctx;
    this.loading = Promise.allSettled(
      [
        "jab",
        "heavy",
        "guard",
        "bell",
        "victory",
        "fight",
        "winner",
        "round1",
        "round2",
        "round3",
      ].map(async (key) => {
        const response = await fetch(`/audio/arcade/${key}.ogg`);
        if (!response.ok) return;
        const decoded = await ctx.decodeAudioData(await response.arrayBuffer());
        if (!this.disposed) this.samples.set(key, decoded);
      }),
    );
  }
  private sample(key: string, volume = 0.5, delay = 0) {
    if (!this.ctx || !this.fx) return;
    const buffer = this.samples.get(key);
    if (!buffer) return;
    const source = this.ctx.createBufferSource(),
      gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.fx);
    source.start(this.ctx.currentTime + delay);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }
  private ctx: AudioContext | null = null;
  private fx: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private duck: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextBeat = 0;
  private musicEnabled = false;
  private musicVolume = 0.35;
  private effectsVolume = 0.75;
  private active = false;
  private voiceEnd = 0;
  private disposed = false;
  unlock() {
    if (this.disposed) return;
    try {
      if (!this.ctx) {
        const ctx = new AudioContext();
        this.ctx = ctx;
        const master = ctx.createGain(),
          compressor = ctx.createDynamicsCompressor();
        master.gain.value = 0.7;
        compressor.threshold.value = -16;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.005;
        compressor.release.value = 0.16;
        compressor.connect(master);
        master.connect(ctx.destination);
        this.fx = ctx.createGain();
        this.fx.gain.value = this.effectsVolume;
        this.fx.connect(compressor);
        this.musicBus = ctx.createGain();
        this.musicBus.gain.value = this.musicEnabled
          ? this.musicVolume * 0.28
          : 0;
        this.duck = ctx.createGain();
        this.musicBus.connect(this.duck);
        this.duck.connect(compressor);
        this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === "suspended")
        void this.ctx.resume().catch(() => {});
      this.scheduleMusic();
    } catch {}
  }
  setLevels(effects: number, music: number, enabled: boolean) {
    this.effectsVolume = effects;
    this.musicVolume = music;
    this.musicEnabled = enabled;
    if (this.ctx) {
      this.fx?.gain.setTargetAtTime(effects, this.ctx.currentTime, 0.025);
      this.musicBus?.gain.setTargetAtTime(
        enabled ? music * 0.28 : 0,
        this.ctx.currentTime,
        0.08,
      );
    }
    if (enabled) this.scheduleMusic();
    else this.stopClock();
  }
  setActive(active: boolean) {
    this.active = active;
  }
  private tone(
    freq: number,
    endFreq: number,
    duration: number,
    volume: number,
    time: number,
    bus: AudioNode,
    type: OscillatorType = "sine",
    pan = 0,
  ) {
    const ctx = this.ctx!;
    const oscillator = ctx.createOscillator(),
      amp = ctx.createGain(),
      panner = ctx.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, time);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFreq),
      time + duration,
    );
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, volume),
      time + 0.004,
    );
    amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    panner.pan.value = pan;
    oscillator.connect(amp);
    amp.connect(panner);
    panner.connect(bus);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.015);
    oscillator.onended = () => {
      oscillator.disconnect();
      amp.disconnect();
      panner.disconnect();
    };
  }
  private noise(
    duration: number,
    volume: number,
    frequency: number,
    time: number,
    bus: AudioNode,
    pan = 0,
  ) {
    const ctx = this.ctx!,
      source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      amp = ctx.createGain(),
      panner = ctx.createStereoPanner();
    source.buffer = this.noiseBuffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    amp.gain.setValueAtTime(volume, time);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    panner.pan.value = pan;
    source.connect(filter);
    filter.connect(amp);
    amp.connect(panner);
    panner.connect(bus);
    source.start(time, Math.random() * 0.5, duration);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      amp.disconnect();
      panner.disconnect();
    };
  }
  play(cue: SoundCue) {
    this.unlock();
    this.loadSamples();
    if (!this.ctx || !this.fx || this.effectsVolume === 0) return;
    const t = this.ctx.currentTime,
      fx = this.fx;
    const v = 0.96 + Math.random() * 0.08;
    if (
      cue === "round1" ||
      cue === "round2" ||
      cue === "round3" ||
      cue === "fight"
    ) {
      const announce = () => {
        if (!this.ctx) return;
        const buffer = this.samples.get(cue);
        if (!buffer) return;
        const delay = Math.max(0, this.voiceEnd - this.ctx.currentTime);
        this.sample(cue, cue === "fight" ? 0.65 : 0.7, delay);
        // Measured from the end of the decoded recording, for every round.
        this.voiceEnd = this.ctx.currentTime + delay + buffer.duration + 1.25;
      };
      if (this.samples.has(cue)) announce();
      else
        void this.loading?.then(() => {
          if (!this.disposed && this.ctx?.state === "running") announce();
        });
      if (cue !== "fight") this.play("bell");
      return;
    }
    if (cue === "charge") {
      this.noise(0.35, 0.13, 1800, t, fx);
      [110, 165, 220].forEach((n, i) =>
        this.tone(n, n * 2, 0.55, 0.06, t + i * 0.04, fx, "sawtooth"),
      );
      return;
    }
    if (cue === "victory") {
      this.sample("winner", 0.8, 0.15);
      this.sample("victory", 0.48, 1.1);
      [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5].forEach((n, i) => {
        this.tone(n, n, 0.38, 0.22, t + i * 0.115, fx, "triangle");
        this.tone(n * 0.5, n * 0.5, 0.4, 0.12, t + i * 0.115, fx, "sine");
      });
      this.noise(0.15, 0.3, 2500, t + 0.86, fx);
      return;
    }
    if (cue === "jab" || cue === "heavy") this.sample(cue, 0.65);
    if (cue === "hurt") this.sample("heavy", 0.45);
    if (cue === "block") this.sample("guard", 0.65);
    if (cue === "bell") this.sample("bell", 0.25);
    if (cue === "select") {
      this.noise(0.055, 0.24, 1800, t, fx);
      this.tone(180, 95, 0.065, 0.15, t, fx);
      return;
    }
    if (cue === "jab" || cue === "heavy" || cue === "hurt") {
      const heavy = cue === "heavy",
        hurt = cue === "hurt";
      this.noise(
        heavy ? 0.18 : 0.105,
        heavy ? 0.8 : 0.6,
        hurt ? 480 : 900,
        t,
        fx,
        hurt ? 0.2 : -0.1,
      );
      this.tone(
        (heavy ? 125 : 185) * v,
        40,
        heavy ? 0.23 : 0.13,
        heavy ? 0.65 : 0.38,
        t,
        fx,
      );
      this.noise(0.04, 0.3, 2600, t + 0.008, fx);
    }
    if (cue === "block") {
      this.noise(0.1, 0.44, 420, t, fx);
      this.tone(270, 110, 0.12, 0.24, t, fx, "triangle");
    }
    if (cue === "parry") {
      this.noise(0.05, 0.28, 2400, t, fx);
      [780, 1170, 1560].forEach((n, i) =>
        this.tone(
          n,
          n * 0.97,
          0.24,
          0.12 / (i + 1),
          t + i * 0.015,
          fx,
          "triangle",
        ),
      );
    }
    if (cue === "feint") {
      this.noise(0.17, 0.5, 1700, t, fx, -0.35);
      this.tone(430, 710, 0.13, 0.13, t + 0.04, fx, "triangle", 0.35);
    }
    if (cue === "recover") {
      this.noise(0.32, 0.12, 900, t, fx);
      this.tone(220, 330, 0.26, 0.1, t + 0.06, fx, "sine");
    }
    if (cue === "miss") {
      this.noise(0.1, 0.24, 600, t, fx);
      this.tone(240, 95, 0.2, 0.18, t, fx, "triangle");
    }
    if (cue === "bell") {
      [620, 1240, 1710].forEach((n, i) =>
        this.tone(n, n * 0.998, 0.8, 0.22 / (i + 1), t, fx, "sine"),
      );
    }
    if (cue === "win" || cue === "lose") {
      const notes = cue === "win" ? [330, 415, 494, 660] : [330, 294, 247, 220];
      notes.forEach((n, i) =>
        this.tone(n, n, 0.25, 0.22, t + i * 0.12, fx, "triangle"),
      );
    }
    if (this.duck) {
      this.duck.gain.cancelScheduledValues(t);
      this.duck.gain.setValueAtTime(0.38, t);
      this.duck.gain.setTargetAtTime(1, t + 0.12, 0.14);
    }
  }
  private scheduleMusic() {
    if (!this.ctx || !this.musicEnabled || this.ticker || this.disposed) return;
    this.nextBeat = this.ctx.currentTime + 0.06;
    const tick = () => {
      const ctx = this.ctx;
      if (!ctx || ctx.state !== "running") return;
      if (this.nextBeat < ctx.currentTime - 0.2)
        this.nextBeat = ctx.currentTime + 0.04;
      while (this.nextBeat < ctx.currentTime + 0.12) {
        this.beat(this.step++, this.nextBeat);
        this.nextBeat += 60 / 104 / 4;
      }
    };
    tick();
    this.ticker = setInterval(tick, 25);
  }
  private beat(step: number, t: number) {
    const bus = this.musicBus!;
    const s = step % 16,
      bar = Math.floor(step / 16) % 8;
    const root = [82.41, 82.41, 98, 98, 110, 110, 73.42, 82.41][bar];
    if ([0, 6, 10].includes(s)) this.tone(115, 39, 0.18, 0.58, t, bus);
    if (s === 4 || s === 12) {
      this.noise(0.09, 0.4, 1300, t, bus);
      this.tone(180, 130, 0.07, 0.1, t, bus);
    }
    if (s % 2 === 0 || this.active)
      this.noise(
        0.035,
        s % 2 ? 0.08 : 0.14,
        6400,
        t,
        bus,
        s % 4 === 0 ? -0.35 : 0.35,
      );
    if ([0, 3, 7, 10, 14].includes(s))
      this.tone(
        root * (s === 14 ? 2 : 1),
        root * (s === 14 ? 2 : 1),
        0.17,
        0.27,
        t,
        bus,
        "triangle",
      );
    if ([2, 5, 8, 11, 15].includes(s))
      this.tone(1450, 700, 0.035, 0.11, t, bus, "sine", s % 2 ? -0.3 : 0.3);
    if ([1, 7, 13].includes(s)) {
      const ratio = [1.5, 2, 2.25][[1, 7, 13].indexOf(s)];
      this.tone(
        root * 4 * ratio,
        root * 4 * ratio,
        0.22,
        0.075,
        t,
        bus,
        "triangle",
        0.2,
      );
    }
  }
  private stopClock() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }
  suspend() {
    this.stopClock();
    if (this.ctx?.state === "running") void this.ctx.suspend().catch(() => {});
  }
  resume() {
    if (this.ctx) {
      void this.ctx
        .resume()
        .then(() => this.scheduleMusic())
        .catch(() => {});
    }
  }
  dispose() {
    this.disposed = true;
    this.stopClock();
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
