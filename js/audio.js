/**
 * Gravity Falls 3D - Sistema de Audio Web Audio API
 * Genera un arreglo instrumental original inspirado en el tema de apertura
 * de Gravity Falls (sin archivos externos ni problemas de derechos/CORS)
 * y efectos de sonido retro-animados.
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.isPlayingMusic = false;
    this.musicTimer = null;
    this.stepIndex = 0;

    // Frecuencias en Hz (Re menor misterioso)
    this.notes = {
      D3: 146.83, F3: 174.61, G3: 196.00, A3: 220.00, Bb3: 233.08, C4: 261.63,
      D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, Bb4: 466.16,
      C5: 523.25, Cs5: 554.37, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00
    };

    // Patrón rítmico de 32 semicorcheas/corcheas (arpegio + melodía silbada)
    this.arpeggio = [
      'D4','F4','A4','F4', 'D4','F4','A4','F4',
      'Bb3','D4','F4','D4', 'Bb3','D4','F4','D4',
      'C4','E4','G4','E4', 'A3','Cs5','E5','Cs5',
      'D4','F4','A4','D5', 'A4','F4','E4','D4'
    ];

    this.melody = [
      'D5', null, 'E5', null, 'F5', null, null, 'A5',
      'G5', null, 'F5', null, 'D5', null, null, null,
      'E5', null, 'F5', null, 'E5', null, 'Cs5', null,
      'D5', null, null, null, null, null, null, null
    ];

    this.bass = [
      'D3', null, null, null, 'D3', null, null, null,
      'Bb3', null, null, null, 'Bb3', null, null, null,
      'C4', null, null, null, 'A3', null, null, null,
      'D3', null, null, null, 'A3', null, null, null
    ];
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.7;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.28;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.55;
    this.sfxGain.connect(this.masterGain);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.7, this.ctx.currentTime, 0.04);
    }
    return this.muted;
  }

  startMusic() {
    this.init();
    if (!this.ctx || this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    const stepMs = 155; // ~193 BPM en corcheas rápidas estilo misterio animado

    this.musicTimer = setInterval(() => {
      if (!this.isPlayingMusic || !this.ctx || this.ctx.state !== 'running') return;
      const idx = this.stepIndex % this.arpeggio.length;
      const now = this.ctx.currentTime;

      const arpNote = this.arpeggio[idx];
      if (arpNote && this.notes[arpNote]) {
        this._playTone(this.notes[arpNote], 'triangle', 0.13, 0.14, this.musicGain, now);
      }

      const melNote = this.melody[idx];
      if (melNote && this.notes[melNote]) {
        // Silbido / flauta misteriosa
        this._playTone(this.notes[melNote], 'sine', 0.28, 0.24, this.musicGain, now);
      }

      const bassNote = this.bass[idx];
      if (bassNote && this.notes[bassNote]) {
        this._playTone(this.notes[bassNote], 'sawtooth', 0.26, 0.11, this.musicGain, now, 380);
      }

      this.stepIndex++;
    }, stepMs);
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  _playTone(freq, type, duration, volume, dest, startTime = null, lowpass = null) {
    if (!this.ctx || this.muted) return;
    const t = startTime ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    if (lowpass) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  playJump() {
    this.init();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(590, t + 0.16);
    gain.gain.setValueAtTime(0.26, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  playAttack() {
    this.init();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.12);
    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playCoin() {
    this.init();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._playTone(880, 'sine', 0.09, 0.22, this.sfxGain, t);
    this._playTone(1318.5, 'sine', 0.16, 0.22, this.sfxGain, t + 0.07);
  }

  playPage() {
    this.init();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this._playTone(f, 'triangle', 0.18, 0.25, this.sfxGain, t + i * 0.07);
    });
  }

  playPuzzle() {
    this.init();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [392, 493.88, 587.33, 783.99].forEach((f, i) => {
      this._playTone(f, 'sine', 0.24, 0.28, this.sfxGain, t + i * 0.09);
    });
  }

  playHurt() {
    this.init();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._playTone(190, 'sawtooth', 0.18, 0.28, this.sfxGain, t, 600);
    this._playTone(130, 'sawtooth', 0.22, 0.28, this.sfxGain, t + 0.08, 500);
  }

  playSwitch() {
    this.init();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this._playTone(440, 'triangle', 0.08, 0.2, this.sfxGain, t);
    this._playTone(660, 'triangle', 0.1, 0.2, this.sfxGain, t + 0.06);
  }

  playVictory() {
    this.init();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      this._playTone(f, 'triangle', 0.3, 0.3, this.sfxGain, t + i * 0.11);
    });
  }
}

window.soundManager = new SoundManager();
