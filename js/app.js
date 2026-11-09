/* ==========================================================================
   Alesis V49 - Main Application & Web MIDI Integration
   Handles MIDI devices, visual feedback, hardware mapping & UI events
   ========================================================================== */

// Global keyboard configuration
window.NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
window.baseOctaveOffset = 36; // C2 by default (36 to 84)
window.physicalKeyDivs = [];
const TOTAL_KEYS = 49;

/* ==========================================================================
   VIRTUAL KEYBOARD RENDERING (49 Keys: C2 to C6)
   ========================================================================== */
const keyboardEl = document.getElementById('keyboardContainer');

function renderKeyboard() {
  if (!keyboardEl) return;
  keyboardEl.innerHTML = '';
  window.physicalKeyDivs = [];

  let whiteKeyCount = 0;
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const noteNum = window.baseOctaveOffset + i;
    const noteName = window.NOTE_NAMES[noteNum % 12];
    if (!noteName.includes('#')) whiteKeyCount++;
  }

  // 1. Build White Keys
  let wIdx = 0;
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const noteNum = window.baseOctaveOffset + i;
    const noteName = window.NOTE_NAMES[noteNum % 12];
    const octave = Math.floor(noteNum / 12) - 1;
    const fullName = `${noteName}${octave}`;
    const isBlack = noteName.includes('#');

    if (!isBlack) {
      const keyDiv = document.createElement('div');
      keyDiv.dataset.keyIndex = i;
      keyDiv.dataset.note = noteNum;
      keyDiv.dataset.name = fullName;
      keyDiv.className = 'key-white relative flex-1 h-full rounded-b-md border-r border-slate-400/40 flex flex-col justify-end items-center pb-2 text-[10px] text-slate-600 font-bold transition-all cursor-pointer hover:bg-slate-100';
      if (checklist.keys.has(i)) keyDiv.classList.add('key-tested');
      keyDiv.innerHTML = `<span class="opacity-70 pointer-events-none">${fullName}</span>`;
      keyboardEl.appendChild(keyDiv);
      window.physicalKeyDivs[i] = keyDiv;
      wIdx++;
    }
  }

  // 2. Build Black Keys Overlaid
  wIdx = 0;
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const noteNum = window.baseOctaveOffset + i;
    const noteName = window.NOTE_NAMES[noteNum % 12];
    const octave = Math.floor(noteNum / 12) - 1;
    const fullName = `${noteName}${octave}`;
    const isBlack = noteName.includes('#');

    if (isBlack) {
      const blackKeyDiv = document.createElement('div');
      blackKeyDiv.dataset.keyIndex = i;
      blackKeyDiv.dataset.note = noteNum;
      blackKeyDiv.dataset.name = fullName;
      blackKeyDiv.className = 'key-black absolute z-10 w-[2.8%] h-[60%] rounded-b-md border border-slate-900 cursor-pointer flex flex-col justify-end items-center pb-1 text-[8px] font-mono text-slate-400 transition-all hover:bg-slate-700';
      if (checklist.keys.has(i)) blackKeyDiv.classList.add('key-tested');
      blackKeyDiv.innerHTML = `<span class="opacity-80 pointer-events-none">${noteName}</span>`;

      const whiteWidthPercent = 100 / whiteKeyCount;
      const leftPercent = (wIdx * whiteWidthPercent) - (whiteWidthPercent * 0.35);
      blackKeyDiv.style.left = `${leftPercent}%`;

      keyboardEl.appendChild(blackKeyDiv);
      window.physicalKeyDivs[i] = blackKeyDiv;
    } else {
      wIdx++;
    }
  }

  // Update Octave Info Labels
  const baseNoteName = window.NOTE_NAMES[window.baseOctaveOffset % 12];
  const baseOctNum = Math.floor(window.baseOctaveOffset / 12) - 1;
  const endNoteName = window.NOTE_NAMES[(window.baseOctaveOffset + 48) % 12];
  const endOctNum = Math.floor((window.baseOctaveOffset + 48) / 12) - 1;

  const octaveLabel = document.getElementById('currentOctaveShiftLabel');
  if (octaveLabel) octaveLabel.textContent = `${baseNoteName}${baseOctNum}`;

  const octaveIndicator = document.getElementById('octaveIndicator');
  if (octaveIndicator) {
    octaveIndicator.innerHTML = `Rango Teclado: <strong class="text-cyan-400">${baseNoteName}${baseOctNum} (${window.baseOctaveOffset}) - ${endNoteName}${endOctNum} (${window.baseOctaveOffset + 48})</strong>`;
  }
}

// Octave Controls
const octaveUpBtn = document.getElementById('octaveUpBtn');
if (octaveUpBtn) {
  octaveUpBtn.addEventListener('click', () => {
    if (window.baseOctaveOffset < 60) {
      window.baseOctaveOffset += 12;
      renderKeyboard();
    }
  });
}

const octaveDownBtn = document.getElementById('octaveDownBtn');
if (octaveDownBtn) {
  octaveDownBtn.addEventListener('click', () => {
    if (window.baseOctaveOffset > 12) {
      window.baseOctaveOffset -= 12;
      renderKeyboard();
    }
  });
}

let autoOctaveEnabled = true;
const autoOctaveBtn = document.getElementById('autoOctaveBtn');
if (autoOctaveBtn) {
  autoOctaveBtn.addEventListener('click', () => {
    autoOctaveEnabled = !autoOctaveEnabled;
    autoOctaveBtn.className = autoOctaveEnabled
      ? 'ml-1 text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.5 rounded hover:bg-cyan-900'
      : 'ml-1 text-[9px] bg-slate-800 text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded';
  });
}

// Panic Button: Silence All Sound
const panicBtn = document.getElementById('panicBtn');
if (panicBtn) {
  panicBtn.addEventListener('click', () => {
    audio.allNotesOff();
    document.querySelectorAll('.key-white.active, .key-black.active').forEach(k => k.classList.remove('active'));
    const badge = document.getElementById('sustainStatusBadge');
    if (badge) {
      badge.textContent = 'SUSTAIN: OFF';
      badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 cursor-pointer';
    }
    addMidiLog('Sistema', 'PANIC', '-', 'Todas', 0, 'Audio silenciado de emergencia');
  });
}

// Visual Key Activation with Octave-Shift resilience
function highlightKeyVisual(noteNum, velocity, isDown) {
  let keyIndex = noteNum - window.baseOctaveOffset;

  // Auto-adapt base octave if note falls outside current view
  if (autoOctaveEnabled && (keyIndex < 0 || keyIndex >= TOTAL_KEYS)) {
    if (keyIndex < 0 && window.baseOctaveOffset >= 12) {
      while (noteNum < window.baseOctaveOffset && window.baseOctaveOffset > 12) {
        window.baseOctaveOffset -= 12;
      }
      renderKeyboard();
      keyIndex = noteNum - window.baseOctaveOffset;
    } else if (keyIndex >= TOTAL_KEYS && window.baseOctaveOffset <= 60) {
      while (noteNum >= (window.baseOctaveOffset + TOTAL_KEYS) && window.baseOctaveOffset <= 60) {
        window.baseOctaveOffset += 12;
      }
      renderKeyboard();
      keyIndex = noteNum - window.baseOctaveOffset;
    }
  }

  // Modulo mapping so every key is tracked
  const normalizedIndex = ((keyIndex % TOTAL_KEYS) + TOTAL_KEYS) % TOTAL_KEYS;
  const key = window.physicalKeyDivs[normalizedIndex];

  if (isDown) {
    if (key) key.classList.add('active');
    const noteName = `${window.NOTE_NAMES[noteNum % 12]}${Math.floor(noteNum / 12) - 1}`;
    const display = document.getElementById('activeNoteDisplay');
    if (display) {
      display.textContent = `Nota: ${noteName} (#${noteNum}) | Tecla Física: ${normalizedIndex + 1}/49 | Velocity: ${velocity}`;
    }
    checklist.markKey(normalizedIndex);
  } else {
    if (key) key.classList.remove('active');
  }
}

// Touch / Mouse interaction on virtual keyboard
if (keyboardEl) {
  keyboardEl.addEventListener('mousedown', (e) => {
    const target = e.target.closest('[data-note]');
    if (!target) return;
    const note = parseInt(target.dataset.note, 10);
    audio.noteOn(note, 105);
    highlightKeyVisual(note, 105, true);
    addMidiLog('Web Click', 'Note On', 1, target.dataset.name, 105, 'Prueba táctil virtual');

    const onMouseUp = () => {
      audio.noteOff(note);
      highlightKeyVisual(note, 0, false);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mouseup', onMouseUp);
  });
}

/* ==========================================================================
   PADS INTERACTION & DRUMS (FACTORY PRESETS & CLEAN SEPARATION)
   ========================================================================== */
const padButtons = document.querySelectorAll('.drum-pad');

const PAD_PRESETS = {
  gm: [36, 38, 42, 46, 41, 45, 49, 51],          // Standard GM Drum Map (Channel 10)
  factory48: [48, 49, 50, 51, 52, 53, 54, 55],    // Factory Alesis V49 Chromatic C3
  chromatic36: [36, 37, 38, 39, 40, 41, 42, 43]   // Chromatic C1-G1
};

let padNoteMap = [...PAD_PRESETS.gm];
let padChannelMap = [-1, -1, -1, -1, -1, -1, -1, -1];
let padWizardStep = -1; // -1 = idle, 0..7 = capturing Pad 1..8

function setPadPreset(mode) {
  stopPadWizard();
  if (PAD_PRESETS[mode]) {
    padNoteMap = [...PAD_PRESETS[mode]];
    padChannelMap = [-1, -1, -1, -1, -1, -1, -1, -1];
    for (let i = 0; i < 8; i++) updatePadLabel(i, padNoteMap[i]);
  }
}

function updatePadLabel(padIdx, noteVal) {
  const label = document.getElementById(`padNoteLabel${padIdx}`);
  if (label) {
    label.textContent = noteVal === '--' ? 'Pendiente' : `#${noteVal}`;
  }
}

// Step-by-Step Pad Learning Wizard
const wizardPrompt = document.getElementById('padWizardPrompt');
const wizardText = document.getElementById('padWizardPromptText');
const wizardBtn = document.getElementById('learnPadsWizardBtn');

function startPadWizard() {
  padWizardStep = 0;
  if (wizardPrompt) wizardPrompt.classList.remove('hidden');
  if (wizardBtn) {
    wizardBtn.classList.remove('bg-amber-500', 'text-slate-950');
    wizardBtn.classList.add('bg-red-500', 'text-white');
    wizardBtn.innerHTML = '✕ <span>Cancelar</span>';
  }
  highlightPadWizardStep();
}

function stopPadWizard() {
  padWizardStep = -1;
  if (wizardPrompt) wizardPrompt.classList.add('hidden');
  if (wizardBtn) {
    wizardBtn.classList.remove('bg-red-500', 'text-white');
    wizardBtn.classList.add('bg-amber-500', 'text-slate-950');
    wizardBtn.innerHTML = '🎯 <span>Asignar 1 a 8</span>';
  }
  padButtons.forEach(b => b.classList.remove('ring-2', 'ring-amber-400', 'animate-pulse'));
}

function highlightPadWizardStep() {
  padButtons.forEach((b, idx) => {
    if (idx === padWizardStep) {
      b.classList.add('ring-2', 'ring-amber-400', 'animate-pulse');
    } else {
      b.classList.remove('ring-2', 'ring-amber-400', 'animate-pulse');
    }
  });
  if (padWizardStep >= 0 && padWizardStep < 8 && wizardText) {
    wizardText.innerHTML = `👉 Golpea el <strong class="text-amber-300 uppercase">PAD ${padWizardStep + 1}</strong> físico en tu Alesis...`;
  }
}

function advancePadWizard() {
  padWizardStep++;
  if (padWizardStep < 8) {
    highlightPadWizardStep();
  } else {
    if (wizardText) {
      wizardText.innerHTML = '🎉 <strong class="text-emerald-300">¡Los 8 Pads fueron configurados en orden!</strong>';
    }
    padButtons.forEach(b => b.classList.remove('ring-2', 'ring-amber-400', 'animate-pulse'));
    setTimeout(() => {
      stopPadWizard();
    }, 1800);
  }
}

if (wizardBtn) {
  wizardBtn.addEventListener('click', () => {
    if (padWizardStep === -1) {
      startPadWizard();
    } else {
      stopPadWizard();
    }
  });
}

const cancelWizardBtn = document.getElementById('cancelPadWizardBtn');
if (cancelWizardBtn) {
  cancelWizardBtn.addEventListener('click', stopPadWizard);
}

const padPresetSelect = document.getElementById('padMapPreset');
if (padPresetSelect) {
  padPresetSelect.addEventListener('change', (e) => {
    setPadPreset(e.target.value);
  });
}

const resetPadsBtn = document.getElementById('resetPadsBtn');
if (resetPadsBtn) {
  resetPadsBtn.addEventListener('click', () => {
    const val = padPresetSelect ? padPresetSelect.value : 'gm';
    setPadPreset(val);
    checklist.pads.clear();
    const countEl = document.getElementById('testedPadsCount');
    if (countEl) countEl.textContent = '0';
    checklist.updateTotal();
  });
}

padButtons.forEach(btn => {
  btn.addEventListener('mousedown', () => {
    const padIdx = parseInt(btn.dataset.pad, 10);
    triggerPadHit(padIdx, 110);
    const assignedNote = padNoteMap[padIdx] !== -1 ? `#${padNoteMap[padIdx]}` : `PAD ${padIdx + 1}`;
    addMidiLog('Web Click', 'Pad Hit', 10, assignedNote, 110, 'Prueba de Pad virtual');
  });
});

function resolvePadIndex(noteNumber, channel) {
  // Direct match on learned pad note & channel
  for (let i = 0; i < 8; i++) {
    if (padNoteMap[i] === noteNumber) {
      if (padChannelMap[i] === -1 || padChannelMap[i] === channel) {
        return i;
      }
    }
  }

  // If on MIDI Channel 10 (universal drum channel), resolve via GM table
  if (channel === 10) {
    const gmIdx = PAD_PRESETS.gm.indexOf(noteNumber);
    if (gmIdx !== -1) return gmIdx;
    return (noteNumber % 8);
  }

  return -1;
}

function triggerPadHit(padIndex, velocity = 100) {
  if (padIndex < 0 || padIndex >= 8) return;
  const padEl = padButtons[padIndex];
  audio.triggerDrum(padIndex, velocity);
  checklist.markPad(padIndex);

  if (padEl) {
    padEl.style.backgroundColor = '#f59e0b';
    padEl.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.9)';
    const velText = padEl.querySelector('.pad-vel');
    if (velText) velText.textContent = velocity;

    setTimeout(() => {
      padEl.style.backgroundColor = '';
      padEl.style.boxShadow = '';
    }, 150);
  }
}

/* ==========================================================================
   ROTARY KNOBS MAPPING (ALESIS V49 DEFAULT CC 20..23)
   ========================================================================== */
const knobAssignments = [20, 21, 22, 23];
const knobValues = [90, 20, 25, 40];

function updateKnobVisual(knobIndex, val127) {
  knobValues[knobIndex] = val127;
  const valEl = document.getElementById(`knobVal${knobIndex + 1}`);
  if (valEl) valEl.textContent = val127;

  const pct = val127 / 127;
  const offset = 100 - (pct * 75);
  const arc = document.getElementById(`knobArc${knobIndex + 1}`);
  if (arc) arc.setAttribute('stroke-dashoffset', offset);

  const deg = -135 + (pct * 270);
  const indicator = document.getElementById(`knobIndicator${knobIndex + 1}`);
  if (indicator) indicator.style.transform = `translateY(-6px) rotate(${deg}deg)`;

  checklist.markKnob(knobIndex);

  if (knobIndex === 0) audio.setFilterCutoff(pct);
  if (knobIndex === 1) audio.setFilterResonance(pct);
  if (knobIndex === 2) audio.setDelayMix(pct);
  if (knobIndex === 3) audio.setReleaseTime(pct);
}

/* ==========================================================================
   PITCH BEND & MODULATION WHEELS
   ========================================================================== */
function setPitchBendVisual(raw14bit) {
  const centered = raw14bit - 8192; // -8192 to +8191
  const norm = centered / 8192; // -1 to +1

  const display = document.getElementById('pitchBendValDisplay');
  if (display) display.textContent = (centered >= 0 ? '+' : '') + centered;

  const travel = 44;
  const topPx = 44 - (norm * travel);
  const handle = document.getElementById('pitchWheelHandle');
  if (handle) handle.style.top = `${topPx}px`;

  audio.setPitchBend(norm);
  checklist.markPitch(centered);
}

function setModulationVisual(val127) {
  const display = document.getElementById('modValDisplay');
  if (display) display.textContent = val127;

  const pct = (val127 / 127) * 100;
  const fill = document.getElementById('modWheelFill');
  if (fill) fill.style.height = `${pct}%`;

  const travel = 88;
  const bottomPx = (val127 / 127) * travel;
  const handle = document.getElementById('modWheelHandle');
  if (handle) handle.style.bottom = `${bottomPx}px`;

  audio.setModulation(val127 / 127);
  checklist.markMod(val127);
}

/* ==========================================================================
   REAL-TIME MIDI LOG CONSOLE
   ========================================================================== */
const logTableBody = document.getElementById('midiLogTableBody');
let logCount = 0;

function addMidiLog(source, type, channel, data1, data2, desc) {
  if (!logTableBody) return;
  if (logCount === 0) {
    logTableBody.innerHTML = '';
  }
  logCount++;

  const tr = document.createElement('tr');
  tr.className = 'hover:bg-slate-800/40 transition-colors font-mono';

  const d = new Date();
  const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;

  let typeColor = 'text-cyan-400';
  if (type.includes('Off')) typeColor = 'text-slate-500';
  if (type.includes('Pitch')) typeColor = 'text-pink-400';
  if (type.includes('CC') || type.includes('Mod')) typeColor = 'text-amber-400';
  if (type.includes('Pad')) typeColor = 'text-emerald-400';

  tr.innerHTML = `
    <td class="py-1 px-3 text-slate-500">${timeStr}</td>
    <td class="py-1 px-3 font-bold ${typeColor}">${type}</td>
    <td class="py-1 px-3 text-slate-400">${channel}</td>
    <td class="py-1 px-3 text-slate-200">${data1}</td>
    <td class="py-1 px-3 font-semibold text-cyan-300">${data2}</td>
    <td class="py-1 px-3 text-slate-400 text-[10px]">${desc}</td>
  `;

  logTableBody.insertBefore(tr, logTableBody.firstChild);

  // Maintain max 60 rows for responsive DOM performance
  if (logTableBody.children.length > 60) {
    logTableBody.removeChild(logTableBody.lastChild);
  }
}

const clearLogBtn = document.getElementById('clearLogBtn');
if (clearLogBtn) {
  clearLogBtn.addEventListener('click', () => {
    if (logTableBody) {
      logTableBody.innerHTML = '<tr class="text-slate-500"><td colspan="6" class="py-4 text-center">Registro limpio. Listo para recibir eventos MIDI...</td></tr>';
    }
    logCount = 0;
  });
}

/* ==========================================================================
   WEB MIDI API INTEGRATION
   ========================================================================== */
let midiAccess = null;

async function initWebMIDI() {
  audio.init();
  audio.resume();

  if (!navigator.requestMIDIAccess) {
    updateMidiStatus(false, 'Navegador no compatible con Web MIDI (Usa Chrome, Edge, Brave u Opera)');
    return;
  }

  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    handleMidiStateChange();
    midiAccess.onstatechange = handleMidiStateChange;
  } catch (err) {
    console.warn('MIDI sandbox or permission restriction:', err.message);
    const banner = document.getElementById('sandboxWarningBanner');
    if (banner) banner.classList.remove('hidden');
    updateMidiStatus(false, 'Acceso MIDI restringido por el navegador.');
  }
}

function handleMidiStateChange() {
  if (!midiAccess) return;
  const inputs = Array.from(midiAccess.inputs.values());
  if (inputs.length === 0) {
    updateMidiStatus(false, 'Sin dispositivos detectados. Conecta tu Alesis V49 por USB.');
    return;
  }

  const preferredInput = inputs.find(i => i.name && i.name.toLowerCase().includes('alesis')) || inputs[0];

  inputs.forEach(input => {
    input.onmidimessage = onMIDIMessage;
  });

  updateMidiStatus(true, `Conectado: ${preferredInput.name || 'Dispositivo MIDI'}`);
  const connectBtnText = document.getElementById('connectBtnText');
  const connectBtn = document.getElementById('connectMidiBtn');
  if (connectBtnText) connectBtnText.textContent = 'Conectado';
  if (connectBtn) {
    connectBtn.classList.remove('from-cyan-500', 'to-blue-600');
    connectBtn.classList.add('bg-emerald-600', 'text-white');
  }
}

function updateMidiStatus(connected, message) {
  const led = document.getElementById('statusLed');
  const text = document.getElementById('statusText');
  if (connected) {
    if (led) led.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/80';
    if (text) {
      text.className = 'text-emerald-300 font-semibold';
      text.textContent = message;
    }
  } else {
    if (led) led.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse';
    if (text) {
      text.className = 'text-slate-300 font-medium';
      text.textContent = message;
    }
  }
}

function onMIDIMessage(event) {
  const data = event.data;
  if (!data || data.length < 2) return;

  const status = data[0];
  const command = status >> 4;
  const channel = (status & 0x0F) + 1;
  const data1 = data[1];
  const data2 = data.length > 2 ? data[2] : 0;

  switch (command) {
    case 9: // NOTE ON
      if (data2 > 0) {
        handleNoteOn(data1, data2, channel);
      } else {
        handleNoteOff(data1, channel);
      }
      break;

    case 8: // NOTE OFF
      handleNoteOff(data1, channel);
      break;

    case 11: // CONTROL CHANGE
      handleControlChange(data1, data2, channel);
      break;

    case 14: // PITCH BEND
      {
        const pitchVal14 = (data2 << 7) | data1;
        setPitchBendVisual(pitchVal14);
        const centered = pitchVal14 - 8192;
        addMidiLog('Alesis V49', 'Pitch Bend', channel, `14-bit (${pitchVal14})`, (centered >= 0 ? '+' : '') + centered, 'Rueda de tono con resorte');
      }
      break;

    default:
      break;
  }
}

function handleNoteOn(note, velocity, channel) {
  // If learning wizard is active, assign pad
  if (padWizardStep >= 0 && padWizardStep < 8) {
    padNoteMap[padWizardStep] = note;
    padChannelMap[padWizardStep] = channel;
    updatePadLabel(padWizardStep, note);
    triggerPadHit(padWizardStep, velocity);
    addMidiLog('Alesis V49', `Pad ${padWizardStep + 1} Asignado`, channel, `Nota ${note}`, velocity, `Asignado correctamente a Pad ${padWizardStep + 1}`);
    advancePadWizard();
    return;
  }

  // Check if note is mapped to a pad or channel 10
  const targetPad = resolvePadIndex(note, channel);
  if (targetPad !== -1 || channel === 10) {
    const padIdx = (targetPad !== -1) ? targetPad : (note % 8);
    triggerPadHit(padIdx, velocity);
    addMidiLog('Alesis V49', `Pad ${padIdx + 1}`, channel, `Nota ${note}`, velocity, 'Golpe de Pad percusión');
    return;
  }

  // Melodic Key on 49-key keyboard
  highlightKeyVisual(note, velocity, true);
  audio.noteOn(note, velocity);

  const noteName = `${window.NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
  addMidiLog('Alesis V49', 'Note On', channel, `${noteName} (#${note})`, velocity, 'Tecla pulsada con dinámica');
}

function handleNoteOff(note, channel) {
  if (channel === 10) return;

  highlightKeyVisual(note, 0, false);
  audio.noteOff(note);

  const noteName = `${window.NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
  addMidiLog('Alesis V49', 'Note Off', channel, `${noteName} (#${note})`, 0, 'Tecla liberada');
}

function handleControlChange(ccNumber, value, channel) {
  // CC 1 = Modulation Wheel
  if (ccNumber === 1) {
    setModulationVisual(value);
    addMidiLog('Alesis V49', 'Mod Wheel (CC 1)', channel, 'CC 1', value, 'Vibrato modulado en tiempo real');
    return;
  }

  // CC 64 = Sustain Pedal
  if (ccNumber === 64) {
    const isDown = value >= 64;
    audio.setSustain(isDown);
    const badge = document.getElementById('sustainStatusBadge');
    if (badge) {
      if (isDown) {
        badge.textContent = 'SUSTAIN: ON';
        badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500 shadow-sm shadow-cyan-500/50 cursor-pointer';
        checklist.markSustain();
      } else {
        badge.textContent = 'SUSTAIN: OFF';
        badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 cursor-pointer';
      }
    }
    addMidiLog('Alesis V49', 'Sustain (CC 64)', channel, 'CC 64', value, isDown ? 'Pedal Pisado (Hold ON)' : 'Pedal Soltado (Hold OFF)');
    return;
  }

  // Ignore standard global MIDI commands
  if ([0, 7, 10, 11, 32, 120, 121, 123].includes(ccNumber)) {
    addMidiLog('Alesis V49', `CC ${ccNumber}`, channel, `CC ${ccNumber}`, value, 'Mensaje de control estándar');
    return;
  }

  // Match Knobs CC 20..23 or alternate common CCs
  let knobIndex = knobAssignments.indexOf(ccNumber);
  if (knobIndex === -1) {
    if (ccNumber >= 20 && ccNumber <= 23) {
      knobIndex = ccNumber - 20;
    } else if (ccNumber >= 14 && ccNumber <= 17) {
      knobIndex = ccNumber - 14;
    } else if (ccNumber >= 71 && ccNumber <= 74) {
      knobIndex = ccNumber - 71;
    }
  }

  if (knobIndex >= 0 && knobIndex < 4) {
    knobAssignments[knobIndex] = ccNumber;
    const ccLabel = document.getElementById(`knobCc${knobIndex + 1}`);
    if (ccLabel) {
      ccLabel.textContent = `CC ${ccNumber}`;
      ccLabel.classList.add('text-cyan-400');
    }
    updateKnobVisual(knobIndex, value);
    const knobNames = ['Cutoff Filtro', 'Resonancia', 'Eco / Delay', 'Release'];
    addMidiLog('Alesis V49', `Knob ${knobIndex + 1} (CC ${ccNumber})`, channel, `CC ${ccNumber}`, value, `${knobNames[knobIndex]} ajustado`);
  } else {
    addMidiLog('Alesis V49', `Control CC ${ccNumber}`, channel, `CC ${ccNumber}`, value, 'Comando CC adicional');
  }
}

/* ==========================================================================
   UI EVENT LISTENERS & INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Render Keyboard and Knobs
  renderKeyboard();
  for (let k = 0; k < 4; k++) {
    updateKnobVisual(k, knobValues[k]);
  }
  setPadPreset('gm');
  updatePendingDiagnoseUI();

  // Connect MIDI button
  const connectBtn = document.getElementById('connectMidiBtn');
  if (connectBtn) {
    connectBtn.addEventListener('click', () => initWebMIDI());
  }

  // Master Volume
  const masterVol = document.getElementById('masterVol');
  if (masterVol) {
    masterVol.addEventListener('input', (e) => audio.setMasterVolume(e.target.value));
  }

  // Sound Preset Select
  const presetSelect = document.getElementById('presetSelect');
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => { audio.preset = e.target.value; });
  }

  // Checklist Actions
  const resetChecklistBtn = document.getElementById('resetChecklistBtn');
  if (resetChecklistBtn) {
    resetChecklistBtn.addEventListener('click', () => checklist.reset());
  }

  const completeChecklistBtn = document.getElementById('completeChecklistBtn');
  if (completeChecklistBtn) {
    completeChecklistBtn.addEventListener('click', () => checklist.forceComplete());
  }

  // Toggle Highlight Missing Keys
  const toggleHighlightBtn = document.getElementById('toggleHighlightMissingBtn');
  if (toggleHighlightBtn) {
    toggleHighlightBtn.addEventListener('click', () => {
      highlightMissingKeys = !highlightMissingKeys;
      const container = document.getElementById('keyboardContainer');
      const dot = document.getElementById('highlightToggleDot');

      if (highlightMissingKeys) {
        if (container) container.classList.add('show-pending-keys');
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        toggleHighlightBtn.classList.add('border-cyan-500', 'bg-slate-800');
      } else {
        if (container) container.classList.remove('show-pending-keys');
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-amber-400';
        toggleHighlightBtn.classList.remove('border-cyan-500', 'bg-slate-800');
      }
    });
  }

  // Interactive Pitch Wheel Drag
  let isDraggingPitch = false;
  const pitchHandle = document.getElementById('pitchWheelHandle');
  if (pitchHandle) {
    pitchHandle.addEventListener('mousedown', () => { isDraggingPitch = true; });
    window.addEventListener('mouseup', () => {
      if (isDraggingPitch) {
        isDraggingPitch = false;
        setPitchBendVisual(8192); // Center spring return
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDraggingPitch) return;
      const track = pitchHandle.parentElement.getBoundingClientRect();
      const relY = Math.max(0, Math.min(1, (e.clientY - track.top) / track.height));
      const val14 = Math.round((1 - relY) * 16383);
      setPitchBendVisual(val14);
    });
  }

  // Standalone Download & Open in New Tab
  const downloadStandaloneBtn = document.getElementById('downloadStandaloneBtn');
  if (downloadStandaloneBtn) {
    downloadStandaloneBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = 'Alesis_V49_Tester.html';
      link.download = 'Alesis_V49_Tester.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  const openNewTabBtn = document.getElementById('openNewTabBtn');
  if (openNewTabBtn) {
    openNewTabBtn.addEventListener('click', () => {
      window.open(window.location.href, '_blank');
    });
  }

  // Computer Keyboard Playback (A, W, S, E, D, F...)
  const KEY_NOTE_MAP = {
    'KeyA': 48, 'KeyW': 49, 'KeyS': 50, 'KeyE': 51, 'KeyD': 52,
    'KeyF': 53, 'KeyT': 54, 'KeyG': 55, 'KeyY': 56, 'KeyH': 57,
    'KeyU': 58, 'KeyJ': 59, 'KeyK': 60
  };
  const activeKeysDown = new Set();

  window.addEventListener('keydown', (e) => {
    if (e.repeat || activeKeysDown.has(e.code)) return;
    if (KEY_NOTE_MAP[e.code]) {
      activeKeysDown.add(e.code);
      const note = KEY_NOTE_MAP[e.code];
      handleNoteOn(note, 100, 1);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (KEY_NOTE_MAP[e.code]) {
      activeKeysDown.delete(e.code);
      const note = KEY_NOTE_MAP[e.code];
      handleNoteOff(note, 1);
    }
  });

  // Auto initialize audio on first user gesture
  window.addEventListener('click', () => {
    audio.init();
    audio.resume();
  }, { once: true });
});
