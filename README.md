# 🎹 Alesis V49 - Hardware Tester & Sound Workstation

> **Herramienta web interactiva para diagnóstico, prueba de hardware y sintetizador en tiempo real para el controlador MIDI Alesis V49.**

[![Demo Online - Probar en GitHub Pages](https://img.shields.io/badge/Demo%20Online-GitHub%20Pages-22c55e?style=for-the-badge&logo=github&logoColor=white)](https://castiquark.github.io/Alesis-v49-Web-MIDI-Tester-Synth/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Web MIDI API](https://img.shields.io/badge/Web%20MIDI-API-emerald.svg)
![Web Audio API](https://img.shields.io/badge/Web%20Audio-API-cyan.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8.svg)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen.svg)

🚀 **[Haz clic aquí para probar la aplicación en vivo](https://castiquark.github.io/Alesis-v49-Web-MIDI-Tester-Synth/)**

Una estación de diagnóstico moderna, rápida y completamente funcional en el navegador para verificar cada componente físico del teclado controlador **Alesis V49** (y otros teclados MIDI de 49 teclas). Incluye una réplica visual interactiva, un motor de síntesis de audio polifónico con 4 presets, caja de ritmos para los pads y una consola de monitoreo técnico MIDI en tiempo real.

---

## ✨ Características Principales

### 1. 🎹 Teclado de 49 Teclas Sensible a la Velocidad (C2 a C6)
- Representación visual fidedigna de las 49 teclas (blancas y negras).
- Respuesta visual instantánea al tocar notas físicas o hacer clic con el mouse/pantalla táctil.
- Detección dinámica de la velocidad de pulsación (*Velocity* de 1 a 127).
- Indicador luminoso individual que marca en verde cada tecla probada (`key-tested`).
- Cambio y transposición de octavas (+ / -) con modo **Auto** que adapta la octava visual si tocas notas fuera del rango actual.

### 2. 🥁 8 Pads de Percusión Retroiluminados
- Caja de ritmos sintetizada integrada con sonido percusivo dedicado:
  - Pad 1: *808 Sub-Kick*
  - Pad 2: *Snare Drum*
  - Pad 3: *Closed Hi-Hat*
  - Pad 4: *Open Hi-Hat*
  - Pad 5: *Low Floor Tom*
  - Pad 6: *High Tom*
  - Pad 7: *Clap*
  - Pad 8: *Crash Cymbal*
- Detección precisa de dinámica y golpe con brillo ámbar y feedback visual de velocidad.
- **Asistente de Aprendizaje (Wizard)**: Configura los pads 1 a 8 en orden con un solo clic presionando cada pad físico.
- Presets rápidos de fábrica: Canal 10 GM Drums, Alesis Fábrica (Notas 48 a 55) y Cromático C1.
- *Aislamiento estricto*: Los pads solo disparan percusión *one-shot*, evitando notas sintetizadas colgadas.

### 3. 🎛️ 4 Perillas Giratorias (Knobs Asignables CC 20..23)
- Mapeo nativo a los valores por defecto del Alesis V49 (CC 20, 21, 22, 23).
- Indicador gráfico circular SVG con arco de progreso y aguja giratoria.
- Modulación sonora en tiempo real sobre el motor de audio:
  - **Knob 1 (CC 20)**: Frecuencia de corte (*Lowpass Filter Cutoff* de 80 Hz a 16 kHz).
  - **Knob 2 (CC 21)**: Resonancia (*Filter Resonance Q*).
  - **Knob 3 (CC 22)**: Mezcla de Eco (*Delay Mix*).
  - **Knob 4 (CC 23)**: Tiempo de decaimiento (*Release Time*).

### 4. ↕️ Ruedas de Pitch Bend y Modulación
- **Pitch Bend**: Rueda de tono con retorno automático al centro mediante resorte físico virtual (-8192 a +8191, resolución de 14 bits).
- **Modulation (CC 1)**: Rueda de modulación con barra LED iluminada en tiempo real y vibrato audible en los sintetizadores (0 a 127).

### 5. 🦶 Pedal de Sustain (CC 64)
- Detección automática del pedal de sostenido con protección de polaridad.
- Badge luminoso con estado `SUSTAIN: ON` / `SUSTAIN: OFF`.

### 6. 📋 Checklist de Salud de Hardware & Diagnóstico Dinámico
- Porcentaje global de verificación de hardware (Teclas 45%, Pads 20%, Knobs 15%, Pitch 10%, Mod 10%).
- Tarjetas individuales para cada componente que cambian a verde al verificar su correcto funcionamiento.
- **Panel "¿Qué falta probar todavía?"**: Te indica exactamente cuáles teclas o controles restan por pulsar (con nombres de notas específicos si faltan 8 o menos).
- Botón **"Resaltar teclas pendientes"** que ilumina en amarillo las teclas que aún no han sido tocadas.

### 7. 📊 Monitor Técnico MIDI en Tiempo Real
- Consola de eventos de baja latencia con timestamp (Hora, Mensaje, Canal, Dato 1, Dato 2 y Detalle explicativo).
- Filtrado de colores por tipo de evento (Note On, Note Off, Control Change, Pitch Bend, Pads).
- Botón para limpiar registro.

### 8. 🔊 Sintetizador Polifónico Web Audio API
- 4 Presets de sonido sintetizados en tiempo real:
  - **Analog Saw Lead**: Doble oscilador de sierra desafinado con ataque rápido.
  - **Electric Piano (Rhodes)**: Tono cálido con campana armónica sinusoidal y triangular.
  - **Warm Synth Pad**: Almohadilla sintética con envolvente suave.
  - **Vintage Organ**: Órgano aditivo clásico de 3 armónicos.
- Botón de emergencia **SILENCIAR (PANIC)** para cortar cualquier nota sonando.
- Control maestro de volumen.

### 9. 💻 Modo de Prueba sin Controlador Físico
- Puedes probar el sonido y las teclas tocando directamente en pantalla o utilizando las teclas de tu computadora portátil/PC (`A`, `W`, `S`, `E`, `D`, `F`, `T`, `G`, `Y`, `H`, `U`, `J`, `K`).

---

## 🚀 Cómo Usarlo

No requiere instalación de software, Node.js ni herramientas de compilación. Funciona directamente en cualquier navegador moderno compatible con **Web MIDI API**.

### 🌐 Opción 1: En Línea (Recomendado)
Entra directamente desde tu navegador a:  
👉 **[https://castiquark.github.io/Alesis-v49-Web-MIDI-Tester-Synth/](https://castiquark.github.io/Alesis-v49-Web-MIDI-Tester-Synth/)**

### 💻 Opción 2: En Local
1. Clona o descarga este repositorio.
2. Abre [`index.html`](index.html) en tu navegador preferido.

### Navegadores Compatibles
- ✅ **Google Chrome** (Recomendado)
- ✅ **Microsoft Edge**
- ✅ **Brave**
- ✅ **Opera**

*(Nota: Mozilla Firefox y Safari en iOS actualmente no cuentan con soporte nativo para Web MIDI API).*

### Pasos de Conexión
1. Conecta tu **Alesis V49** (u otro teclado MIDI) a un puerto USB de tu computadora.
2. Abre la aplicación (en línea o local).
3. Haz clic en el botón superior **"Conectar Alesis V49"**.
4. El navegador te solicitará permiso para acceder a dispositivos MIDI; selecciona **"Permitir"**.
5. ¡Listo! Al tocar teclas, pads o perillas, la interfaz responderá de inmediato visualmente y con audio.

---

## 📁 Estructura del Proyecto

El proyecto está diseñado bajo una arquitectura limpia y modular para facilitar el mantenimiento y despliegue en **GitHub Pages**:

```
alesis-v49-tester/
│
├── index.html               # Punto de entrada principal (modular, servido en GitHub Pages)
├── Alesis_V49_Tester.html   # Versión standalone (todo-en-uno en un único archivo portátil)
├── .nojekyll                # Desactiva Jekyll en GitHub Pages para carga estática directa
│
├── css/
│   └── style.css            # Estilos personalizados (teclas, ruedas, scrollbars, animaciones)
│
├── js/
│   ├── audio-engine.js      # Motor sintetizador polifónico y batería con Web Audio API
│   ├── checklist.js         # Lógica de verificación de hardware y panel de pendientes
│   └── app.js               # Conexión Web MIDI, renderizado de teclado y eventos de UI
│
├── LICENSE                  # Licencia MIT
└── README.md                # Documentación del proyecto
```

---

## 🛠️ Especificaciones Técnicas MIDI del Alesis V49

| Control Físico | Tipo de Mensaje MIDI | Canal por Defecto | Rango / Parámetro |
| :--- | :--- | :--- | :--- |
| **49 Teclas** | `Note On` / `Note Off` | Canal 1 | Notas 36 (C2) a 84 (C6), Velocidad 1-127 |
| **8 Pads** | `Note On` (One-Shot) | Canal 10 (GM) / Canal 1 | Notas 36, 38, 42, 46, 41, 45, 49, 51 |
| **Pitch Bend** | `Pitch Bend` (14-bit) | Canal 1 | 0 a 16383 (Centro: 8192) |
| **Modulation** | `Control Change` (CC 1) | Canal 1 | Valores de 0 a 127 |
| **Knob 1** | `Control Change` (CC 20) | Canal 1 | Cutoff (0 a 127) |
| **Knob 2** | `Control Change` (CC 21) | Canal 1 | Resonancia (0 a 127) |
| **Knob 3** | `Control Change` (CC 22) | Canal 1 | Eco / Delay Mix (0 a 127) |
| **Knob 4** | `Control Change` (CC 23) | Canal 1 | Release (0 a 127) |
| **Sustain Pedal** | `Control Change` (CC 64) | Canal 1 | Off (0) / On (127) |

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles. Puedes utilizarlo, modificarlo y distribuirlo libremente.
