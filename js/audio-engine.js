/* ==========================================================================
   AUDIO SYNTHESIZER ENGINE (Web Audio API)
   Polyphonic synthesizer & synthesized drum machine for Alesis V49
   ========================================================================== */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.filterNode = null;
    this.delayNode = null;
    this.delayFeedback = null;
    this.delayWet = null;
    this.delayDry = null;
    this.activeVoices = new Map(); // key = noteNumber
    this.sustainPedalDown = false;
    this.heldNotes = new Set();
    this.pitchBendNorm = 0; // -1 to +1
    this.pitchBendSemis = 2; // +/- 2 semitones
    this.modDepth = 0; // 0 to 1
    this.filterCutoffHz = 2500;
    this.filterResonanceQ = 2.0;
    this.releaseTimeSec = 0.4;
    this.preset = 'sawLead';
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

    // Lowpass Biquad Filter
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(this.filterCutoffHz, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(this.filterResonanceQ, this.ctx.currentTime);

    // Delay FX
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.setValueAtTime(0.32, this.ctx.currentTime);
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.setValueAtTime(0.38, this.ctx.currentTime);
    this.delayWet = this.ctx.createGain();
    this.delayWet.gain.setValueAtTime(0.25, this.ctx.currentTime);
    this.delayDry = this.ctx.createGain();
    this.delayDry.gain.setValueAtTime(0.75, this.ctx.currentTime);

    // Delay feedback loop
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);

    // Audio Graph: Voices -> Filter -> Dry/Wet Delay -> Master -> Destination
    this.filterNode.connect(this.delayDry);
    this.filterNode.connect(this.delayNode);
    this.delayNode.connect(this.delayWet);

    this.delayDry.connect(this.masterGain);
    this.delayWet.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMasterVolume(val) {
    if (!this.ctx) return;
    this.masterGain.gain.setTargetAtTime(parseFloat(val), this.ctx.currentTime, 0.02);
  }

  setFilterCutoff(normVal) {
    if (!this.ctx) return;
    // Exponential scale: 80 Hz to 16,000 Hz
    const freq = 80 * Math.pow(16000 / 80, normVal);
    this.filterCutoffHz = freq;
    this.filterNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
  }

  setFilterResonance(normVal) {
    if (!this.ctx) return;
    const q = 0.5 + normVal * 15;
    this.filterResonanceQ = q;
    this.filterNode.Q.setTargetAtTime(q, this.ctx.currentTime, 0.02);
  }

  setDelayMix(normVal) {
    if (!this.ctx) return;
    this.delayWet.gain.setTargetAtTime(normVal * 0.7, this.ctx.currentTime, 0.02);
    this.delayDry.gain.setTargetAtTime(1 - normVal * 0.4, this.ctx.currentTime, 0.02);
  }

  setReleaseTime(normVal) {
    // 0.03s to 0.75s to prevent infinite lingering drones
    this.releaseTimeSec = 0.03 + normVal * 0.72;
  }

  setPitchBend(normVal) {
    this.pitchBendNorm = normVal;
    const totalCents = normVal * (this.pitchBendSemis * 100);
    this.activeVoices.forEach(voice => {
      if (voice.oscs) {
        voice.oscs.forEach(osc => {
          osc.detune.setTargetAtTime(voice.baseDetune + totalCents, this.ctx.currentTime, 0.015);
        });
      }
    });
  }

  setModulation(normVal) {
    this.modDepth = normVal;
    this.activeVoices.forEach(voice => {
      if (voice.vibratoGain) {
        // Apply vibrato depth (up to +/- 70 cents)
        voice.vibratoGain.gain.setTargetAtTime(normVal * 70, this.ctx.currentTime, 0.02);
      }
    });
  }

  midiNoteToFreq(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  noteOn(note, velocity = 100) {
    if (!this.ctx) this.init();
    this.resume();

    // Release previous voice on same note if existing
    if (this.activeVoices.has(note)) {
      this.stopVoice(this.activeVoices.get(note));
    }

    const now = this.ctx.currentTime;
    const freq = this.midiNoteToFreq(note);
    const normVel = Math.max(0.1, velocity / 127);

    // Voice VCA
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0, now);

    // Vibrato LFO per note
    const vibratoLfo = this.ctx.createOscillator();
    vibratoLfo.frequency.setValueAtTime(5.8, now); // 5.8 Hz vibrato rate
    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.setValueAtTime(this.modDepth * 70, now);
    vibratoLfo.connect(vibratoGain);
    vibratoLfo.start(now);

    const oscs = [];
    const baseDetune = 0;
    const currentBendCents = this.pitchBendNorm * (this.pitchBendSemis * 100);

    if (this.preset === 'sawLead') {
      // Dual detuned sawtooth
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);
      osc1.detune.setValueAtTime(-5 + currentBendCents, now);
      vibratoGain.connect(osc1.detune);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq, now);
      osc2.detune.setValueAtTime(5 + currentBendCents, now);
      vibratoGain.connect(osc2.detune);

      osc1.connect(voiceGain);
      osc2.connect(voiceGain);
      osc1.start(now);
      osc2.start(now);
      oscs.push(osc1, osc2);

      // Fast punch attack
      voiceGain.gain.linearRampToValueAtTime(normVel * 0.45, now + 0.015);
      voiceGain.gain.setTargetAtTime(normVel * 0.35, now + 0.03, 0.15);

    } else if (this.preset === 'electricPiano') {
      // Sine + Triangle chime
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc1.detune.setValueAtTime(currentBendCents, now);
      vibratoGain.connect(osc1.detune);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, now); // 1st harmonic overtone
      osc2.detune.setValueAtTime(currentBendCents, now);

      const osc2Gain = this.ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.25, now);
      osc2Gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc1.connect(voiceGain);
      osc2.connect(osc2Gain);
      osc2Gain.connect(voiceGain);

      osc1.start(now);
      osc2.start(now);
      oscs.push(osc1, osc2);

      voiceGain.gain.linearRampToValueAtTime(normVel * 0.5, now + 0.01);
      voiceGain.gain.exponentialRampToValueAtTime(normVel * 0.2, now + 0.8);

    } else if (this.preset === 'warmPad') {
      // Slow attack triangle + saw
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);
      osc1.detune.setValueAtTime(-8 + currentBendCents, now);
      vibratoGain.connect(osc1.detune);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq, now);
      osc2.detune.setValueAtTime(8 + currentBendCents, now);
      vibratoGain.connect(osc2.detune);

      osc1.connect(voiceGain);
      osc2.connect(voiceGain);
      osc1.start(now);
      osc2.start(now);
      oscs.push(osc1, osc2);

      voiceGain.gain.linearRampToValueAtTime(normVel * 0.38, now + 0.18);

    } else if (this.preset === 'organ') {
      // Multi-harmonic additive organ
      const harmonics = [1, 2, 3];
      harmonics.forEach((h, idx) => {
        const osc = this.ctx.createOscillator();
        osc.type = idx === 0 ? 'sine' : 'square';
        osc.frequency.setValueAtTime(freq * h, now);
        osc.detune.setValueAtTime(currentBendCents, now);
        vibratoGain.connect(osc.detune);

        const hGain = this.ctx.createGain();
        hGain.gain.setValueAtTime(0.25 / (idx + 1), now);
        osc.connect(hGain);
        hGain.connect(voiceGain);
        osc.start(now);
        oscs.push(osc);
      });

      voiceGain.gain.linearRampToValueAtTime(normVel * 0.4, now + 0.01);
    }

    voiceGain.connect(this.filterNode);

    const voice = {
      note,
      oscs,
      voiceGain,
      vibratoLfo,
      vibratoGain,
      baseDetune,
      heldBySustain: false,
      startTime: now
    };

    this.activeVoices.set(note, voice);

    // Safety Watchdog: Prevent hanging voices past 8 seconds
    setTimeout(() => {
      if (this.activeVoices.has(note) && this.activeVoices.get(note) === voice && !voice.heldBySustain) {
        this.stopVoice(voice);
        this.activeVoices.delete(note);
      }
    }, 8000);
  }

  noteOff(note) {
    if (!this.activeVoices.has(note)) return;
    const voice = this.activeVoices.get(note);

    if (this.sustainPedalDown) {
      voice.heldBySustain = true;
      this.heldNotes.add(note);
    } else {
      this.stopVoice(voice);
      this.activeVoices.delete(note);
    }
  }

  stopVoice(voice) {
    if (!this.ctx || !voice) return;
    const now = this.ctx.currentTime;
    const rel = Math.max(0.02, Math.min(this.releaseTimeSec, 0.4));

    try {
      voice.voiceGain.gain.cancelScheduledValues(now);
      const currentGain = Math.max(0.0001, voice.voiceGain.gain.value);
      voice.voiceGain.gain.setValueAtTime(currentGain, now);
      voice.voiceGain.gain.linearRampToValueAtTime(0, now + rel);
    } catch (e) {
      try { voice.voiceGain.gain.setValueAtTime(0, now); } catch (err) {}
    }

    setTimeout(() => {
      try {
        voice.oscs.forEach(osc => {
          try { osc.stop(); osc.disconnect(); } catch (e) {}
        });
        if (voice.vibratoLfo) {
          try { voice.vibratoLfo.stop(); voice.vibratoLfo.disconnect(); } catch (e) {}
        }
        voice.voiceGain.disconnect();
      } catch (e) {}
    }, (rel * 1000) + 60);
  }

  allNotesOff() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.activeVoices.forEach(voice => {
      try {
        voice.voiceGain.gain.cancelScheduledValues(now);
        voice.voiceGain.gain.setValueAtTime(0, now);
        voice.oscs.forEach(osc => {
          try { osc.stop(); osc.disconnect(); } catch (e) {}
        });
        if (voice.vibratoLfo) {
          try { voice.vibratoLfo.stop(); voice.vibratoLfo.disconnect(); } catch (e) {}
        }
        voice.voiceGain.disconnect();
      } catch (e) {}
    });
    this.activeVoices.clear();
    this.heldNotes.clear();
    this.sustainPedalDown = false;
  }

  setSustain(isDown) {
    this.sustainPedalDown = isDown;
    if (!isDown) {
      this.heldNotes.forEach(note => {
        if (this.activeVoices.has(note)) {
          this.stopVoice(this.activeVoices.get(note));
          this.activeVoices.delete(note);
        }
      });
      this.heldNotes.clear();
    }
  }

  // Synthesized Percussion for the 8 Pads (Strictly One-Shot)
  triggerDrum(padIndex, velocity = 100) {
    if (!this.ctx) this.init();
    this.resume();
    const now = this.ctx.currentTime;
    const normVel = Math.max(0.1, velocity / 127);

    switch (padIndex) {
      case 0: // 808 Kick
        {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
          gain.gain.setValueAtTime(normVel * 0.9, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.36);
        }
        break;

      case 1: // Snare Drum
        {
          const bufferSize = this.ctx.sampleRate * 0.2;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(800, now);
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(normVel * 0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);
          noise.start(now);

          // Tone body
          const osc = this.ctx.createOscillator();
          const oscGain = this.ctx.createGain();
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
          oscGain.gain.setValueAtTime(normVel * 0.4, now);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(oscGain);
          oscGain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.1);
        }
        break;

      case 2: // Closed Hi-Hat
        {
          const osc = this.ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(8000, now);
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(7000, now);
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(normVel * 0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.06);
        }
        break;

      case 3: // Open Hi-Hat
        {
          const osc = this.ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(6500, now);
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(5000, now);
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(normVel * 0.45, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.36);
        }
        break;

      case 4: // Low Tom
        {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
          gain.gain.setValueAtTime(normVel * 0.7, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.26);
        }
        break;

      case 5: // High Tom
        {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.frequency.setValueAtTime(240, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
          gain.gain.setValueAtTime(normVel * 0.65, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.23);
        }
        break;

      case 6: // Clap
        {
          for (let i = 0; i < 3; i++) {
            const burstTime = now + i * 0.015;
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, burstTime);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(normVel * 0.4, burstTime);
            gain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.03);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(burstTime);
            osc.stop(burstTime + 0.035);
          }
        }
        break;

      case 7: // Crash Cymbal
        {
          const bufferSize = this.ctx.sampleRate * 0.6;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(3500, now);
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(normVel * 0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);
          noise.start(now);
        }
        break;
    }
  }
}

// Global audio engine singleton
const audio = new AudioEngine();
