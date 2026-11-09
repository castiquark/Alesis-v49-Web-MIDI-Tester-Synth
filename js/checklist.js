/* ==========================================================================
   HARDWARE CHECKLIST & DIAGNOSTICS TRACKER
   Verifies functional state of all physical controller components
   ========================================================================== */

const checklist = {
  keys: new Set(),
  pads: new Set(),
  pitchBendUp: false,
  pitchBendDown: false,
  modWheelMoved: false,
  knobsTested: new Set(),
  sustainPressed: false,

  markKey(keyIndex) {
    // keyIndex: 0 to 48 (the 49 physical keys)
    this.keys.add(keyIndex);
    const count = Math.min(49, this.keys.size);
    const countEl = document.getElementById('testedKeysCount');
    if (countEl) countEl.textContent = count;

    // Add green tested marker on visual key
    if (window.physicalKeyDivs && window.physicalKeyDivs[keyIndex]) {
      window.physicalKeyDivs[keyIndex].classList.add('key-tested');
    }

    // Show missing keys helper if nearing completion
    const missingHelper = document.getElementById('missingKeysHelp');
    if (missingHelper) {
      if (this.keys.size >= 40 && this.keys.size < 49) {
        missingHelper.classList.remove('hidden');
        missingHelper.textContent = `Faltan ${49 - this.keys.size} tecla(s) por tocar`;
      } else if (this.keys.size >= 49) {
        missingHelper.classList.add('hidden');
        this.setCardSuccess('checkCardKeys', 'iconCheckKeys');
      }
    }
    this.updateTotal();
  },

  markPad(padIdx) {
    this.pads.add(padIdx);
    const countEl = document.getElementById('testedPadsCount');
    if (countEl) countEl.textContent = this.pads.size;

    if (this.pads.size >= 8) {
      this.setCardSuccess('checkCardPads', 'iconCheckPads');
    }
    this.updateTotal();
  },

  markPitch(value) {
    if (value > 2000) this.pitchBendUp = true;
    if (value < -2000) this.pitchBendDown = true;

    const label = document.getElementById('testedPitchLabel');
    if (label && (this.pitchBendUp || this.pitchBendDown)) {
      label.textContent = (this.pitchBendUp && this.pitchBendDown) ? 'Arriba & Abajo OK' : 'En prueba...';
      label.className = 'text-xs font-bold text-cyan-400';
    }

    if (this.pitchBendUp && this.pitchBendDown) {
      this.setCardSuccess('checkCardPitch', 'iconCheckPitch');
    }
    this.updateTotal();
  },

  markMod(val) {
    if (val > 10) {
      this.modWheelMoved = true;
      const label = document.getElementById('testedModLabel');
      if (label) {
        label.textContent = 'Barrido OK';
        label.className = 'text-xs font-bold text-cyan-400';
      }
      this.setCardSuccess('checkCardMod', 'iconCheckMod');
      this.updateTotal();
    }
  },

  markKnob(knobIndex) {
    this.knobsTested.add(knobIndex);
    const countEl = document.getElementById('testedKnobsCount');
    if (countEl) countEl.textContent = this.knobsTested.size;

    if (this.knobsTested.size >= 4) {
      this.setCardSuccess('checkCardKnobs', 'iconCheckKnobs');
    }
    this.updateTotal();
  },

  markSustain() {
    this.sustainPressed = true;
    const label = document.getElementById('testedSustainLabel');
    if (label) {
      label.textContent = 'Pedal Probado OK';
      label.className = 'text-xs font-bold text-cyan-400';
    }
    this.setCardSuccess('checkCardSustain', 'iconCheckSustain');
    this.updateTotal();
  },

  setCardSuccess(cardId, iconId) {
    const card = document.getElementById(cardId);
    const icon = document.getElementById(iconId);
    if (card) card.classList.add('border-cyan-500/50', 'bg-cyan-950/20');
    if (icon) {
      icon.className = 'w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-lg shadow-cyan-500/30';
    }
  },

  updateTotal() {
    let score = 0;
    score += Math.min(1, this.keys.size / 49) * 45; // Keys 45%
    score += (this.pads.size / 8) * 20;            // Pads 20%
    score += (this.pitchBendUp && this.pitchBendDown ? 10 : (this.pitchBendUp || this.pitchBendDown ? 5 : 0)); // Pitch 10%
    score += (this.modWheelMoved ? 10 : 0);        // Mod 10%
    score += (this.knobsTested.size / 4) * 15;     // Knobs 15%
    const pct = Math.round(score);
    const pctEl = document.getElementById('checklistPercentage');
    if (pctEl) pctEl.textContent = `${pct}% verificado`;

    updatePendingDiagnoseUI();
  },

  forceComplete() {
    for (let i = 0; i < 49; i++) {
      this.keys.add(i);
      if (window.physicalKeyDivs && window.physicalKeyDivs[i]) {
        window.physicalKeyDivs[i].classList.add('key-tested');
      }
    }
    for (let p = 0; p < 8; p++) this.pads.add(p);
    this.pitchBendUp = true;
    this.pitchBendDown = true;
    this.modWheelMoved = true;
    for (let k = 0; k < 4; k++) this.knobsTested.add(k);
    this.sustainPressed = true;

    const keysCount = document.getElementById('testedKeysCount');
    const padsCount = document.getElementById('testedPadsCount');
    const knobsCount = document.getElementById('testedKnobsCount');
    const pitchLabel = document.getElementById('testedPitchLabel');
    const modLabel = document.getElementById('testedModLabel');
    const sustainLabel = document.getElementById('testedSustainLabel');

    if (keysCount) keysCount.textContent = '49';
    if (padsCount) padsCount.textContent = '8';
    if (knobsCount) knobsCount.textContent = '4';
    if (pitchLabel) {
      pitchLabel.textContent = '100% Verificado';
      pitchLabel.className = 'text-xs font-bold text-cyan-400';
    }
    if (modLabel) {
      modLabel.textContent = '100% Verificado';
      modLabel.className = 'text-xs font-bold text-cyan-400';
    }
    if (sustainLabel) {
      sustainLabel.textContent = '100% Verificado';
      sustainLabel.className = 'text-xs font-bold text-cyan-400';
    }

    ['checkCardKeys', 'checkCardPads', 'checkCardPitch', 'checkCardMod', 'checkCardKnobs', 'checkCardSustain'].forEach(id => {
      this.setCardSuccess(id, 'icon' + id.replace('checkCard', 'Check'));
    });

    const pctEl = document.getElementById('checklistPercentage');
    if (pctEl) pctEl.textContent = '100% verificado';

    updatePendingDiagnoseUI();
  },

  reset() {
    this.keys.clear();
    this.pads.clear();
    this.pitchBendUp = false;
    this.pitchBendDown = false;
    this.modWheelMoved = false;
    this.knobsTested.clear();
    this.sustainPressed = false;

    if (window.physicalKeyDivs) {
      window.physicalKeyDivs.forEach(div => {
        if (div) div.classList.remove('key-tested');
      });
    }

    const keysCount = document.getElementById('testedKeysCount');
    const padsCount = document.getElementById('testedPadsCount');
    const knobsCount = document.getElementById('testedKnobsCount');
    const pitchLabel = document.getElementById('testedPitchLabel');
    const modLabel = document.getElementById('testedModLabel');
    const sustainLabel = document.getElementById('testedSustainLabel');
    const missingHelper = document.getElementById('missingKeysHelp');

    if (keysCount) keysCount.textContent = '0';
    if (padsCount) padsCount.textContent = '0';
    if (knobsCount) knobsCount.textContent = '0';
    if (pitchLabel) {
      pitchLabel.textContent = 'Sin mover';
      pitchLabel.className = 'text-xs font-bold text-slate-400';
    }
    if (modLabel) {
      modLabel.textContent = 'Sin mover';
      modLabel.className = 'text-xs font-bold text-slate-400';
    }
    if (sustainLabel) {
      sustainLabel.textContent = 'Opcional';
      sustainLabel.className = 'text-xs font-bold text-slate-400';
    }
    if (missingHelper) missingHelper.classList.add('hidden');

    ['checkCardKeys', 'checkCardPads', 'checkCardPitch', 'checkCardMod', 'checkCardKnobs', 'checkCardSustain'].forEach(id => {
      const card = document.getElementById(id);
      if (card) {
        card.className = 'bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex items-center justify-between transition-colors';
      }
    });

    ['iconCheckKeys', 'iconCheckPads', 'iconCheckPitch', 'iconCheckMod', 'iconCheckKnobs', 'iconCheckSustain'].forEach(id => {
      const icon = document.getElementById(id);
      if (icon) {
        icon.className = 'w-6 h-6 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center text-xs font-bold';
      }
    });

    this.updateTotal();
  }
};

/* ==========================================================================
   DYNAMIC PENDING DIAGNOSTIC UI (¿QUÉ FALTA PROBAR?)
   ========================================================================== */
let highlightMissingKeys = false;

function updatePendingDiagnoseUI() {
  const listEl = document.getElementById('pendingBadgesList');
  const bannerComplete = document.getElementById('allCompleteBanner');
  const pendingHeader = document.getElementById('pendingHeader');
  const countBadge = document.getElementById('pendingItemsCountBadge');

  if (!listEl || !bannerComplete || !pendingHeader || !countBadge) return;

  const pendingItems = [];

  // 1. Check Missing Keys
  const missingKeysCount = 49 - checklist.keys.size;
  if (missingKeysCount > 0) {
    if (missingKeysCount === 49) {
      pendingItems.push({
        icon: '🎹',
        title: '49 Teclas',
        desc: 'Haz un barrido de la primera a la última tecla',
        action: 'Faltan todas'
      });
    } else if (missingKeysCount <= 8) {
      const missingKeyNames = [];
      const noteNames = window.NOTE_NAMES || ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const baseOct = window.baseOctaveOffset !== undefined ? window.baseOctaveOffset : 36;
      for (let i = 0; i < 49; i++) {
        if (!checklist.keys.has(i)) {
          const noteNum = baseOct + i;
          const name = `${noteNames[noteNum % 12]}${Math.floor(noteNum / 12) - 1}`;
          missingKeyNames.push(name);
        }
      }
      pendingItems.push({
        icon: '🎹',
        title: `Faltan ${missingKeysCount} tecla(s)`,
        desc: `Específicamente: ${missingKeyNames.join(', ')}`,
        action: 'Tócalas en el teclado'
      });
    } else {
      pendingItems.push({
        icon: '🎹',
        title: `Teclas (${checklist.keys.size}/49)`,
        desc: `Aún no se han presionado ${missingKeysCount} teclas`,
        action: 'Barrido cromático'
      });
    }
  }

  // 2. Check Missing Pads
  const missingPads = [];
  for (let p = 0; p < 8; p++) {
    if (!checklist.pads.has(p)) missingPads.push(`Pad ${p + 1}`);
  }
  if (missingPads.length > 0) {
    pendingItems.push({
      icon: '🥁',
      title: `Pads (${checklist.pads.size}/8)`,
      desc: `Falta golpear: ${missingPads.join(', ')}`,
      action: 'Golpear con fuerza'
    });
  }

  // 3. Check Pitch Bend
  if (!checklist.pitchBendUp && !checklist.pitchBendDown) {
    pendingItems.push({
      icon: '↕️',
      title: 'Pitch Bend',
      desc: 'Mueve la rueda hacia arriba y hacia abajo para verificar el resorte',
      action: 'Mover rueda izquierda'
    });
  } else if (!checklist.pitchBendUp) {
    pendingItems.push({
      icon: '⬆️',
      title: 'Pitch Bend Arriba',
      desc: 'Falta empujar la rueda hacia arriba (+) al máximo',
      action: 'Empujar arriba'
    });
  } else if (!checklist.pitchBendDown) {
    pendingItems.push({
      icon: '⬇️',
      title: 'Pitch Bend Abajo',
      desc: 'Falta bajar la rueda hacia abajo (-) al máximo',
      action: 'Bajar rueda'
    });
  }

  // 4. Check Mod Wheel
  if (!checklist.modWheelMoved) {
    pendingItems.push({
      icon: '🌊',
      title: 'Rueda Modulación (CC 1)',
      desc: 'Sube la rueda derecha para comprobar el vibrato audible (0 a 127)',
      action: 'Subir rueda derecha'
    });
  }

  // 5. Check Missing Knobs
  const missingKnobs = [];
  for (let k = 0; k < 4; k++) {
    if (!checklist.knobsTested.has(k)) missingKnobs.push(`Knob ${k + 1}`);
  }
  if (missingKnobs.length > 0) {
    pendingItems.push({
      icon: '🎛️',
      title: `Perillas (${checklist.knobsTested.size}/4)`,
      desc: `Falta girar: ${missingKnobs.join(', ')}`,
      action: 'Girar de 0 a 127'
    });
  }

  // 6. Sustain Pedal (Optional)
  if (!checklist.sustainPressed) {
    pendingItems.push({
      icon: '🦶',
      title: 'Pedal Sustain (Opcional)',
      desc: 'Pisa el pedal conectado al jack trasero si dispones de uno',
      action: 'Opcional (CC 64)',
      optional: true
    });
  }

  // Render or show All Complete Banner
  const essentialPending = pendingItems.filter(item => !item.optional);

  if (essentialPending.length === 0) {
    listEl.innerHTML = '';
    bannerComplete.classList.remove('hidden');
    pendingHeader.classList.add('hidden');
  } else {
    bannerComplete.classList.add('hidden');
    pendingHeader.classList.remove('hidden');
    countBadge.textContent = `${essentialPending.length} componente(s) por probar`;

    listEl.innerHTML = pendingItems.map(item => `
      <div class="flex items-center gap-2.5 px-3 py-2 rounded-lg ${item.optional ? 'bg-slate-900/60 border border-slate-800 text-slate-400' : 'bg-amber-950/40 border border-amber-600/40 text-amber-200'}">
        <span class="text-base">${item.icon}</span>
        <div class="leading-tight">
          <div class="font-bold flex items-center gap-1.5 ${item.optional ? 'text-slate-300' : 'text-amber-300'}">
            <span>${item.title}</span>
            <span class="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono ${item.optional ? 'bg-slate-800 text-slate-400' : 'bg-amber-900/60 text-amber-300 border border-amber-700/50'}">${item.action}</span>
          </div>
          <p class="text-[11px] ${item.optional ? 'text-slate-400' : 'text-amber-200/80'}">${item.desc}</p>
        </div>
      </div>
    `).join('');
  }
}
