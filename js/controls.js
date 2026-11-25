/**
 * Gravity Falls 3D - Gestor Unificado de Controles (PC + Móvil/Tableta)
 */
class InputManager {
  constructor(canvas, onAction) {
    this.canvas = canvas;
    this.onAction = onAction; // callbacks: jump, attack, interact, switchChar, pause
    this.keys = {};
    this.touchDir = { up: false, down: false, left: false, right: false };
    this.touchEnabled = this.detectTouchDevice();

    this.touchControlsEl = document.getElementById('touch-controls');
    this._bindKeyboard();
    this._bindMouse();
    this._bindTouchUI();
    this.updateTouchVisibility();
  }

  detectTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    );
  }

  toggleTouchControls() {
    this.touchEnabled = !this.touchEnabled;
    this.updateTouchVisibility();
    return this.touchEnabled;
  }

  updateTouchVisibility() {
    if (!this.touchControlsEl) return;
    if (this.touchEnabled) {
      this.touchControlsEl.classList.remove('hidden');
    } else {
      this.touchControlsEl.classList.add('hidden');
    }
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      const wasDown = this.keys[e.code];
      this.keys[e.code] = true;

      if (!wasDown) {
        if (e.code === 'Space') this.onAction('jump');
        if (e.code === 'KeyE' || e.code === 'KeyF') this.onAction('interact');
        if (e.code === 'KeyP' || e.code === 'Escape') this.onAction('pause');
        if (e.code === 'Digit1') this.onAction('switchChar', 'dipper');
        if (e.code === 'Digit2') this.onAction('switchChar', 'mabel');
        if (e.code === 'Digit3') this.onAction('switchChar', 'stan');
        if (e.code === 'Digit4') this.onAction('switchChar', 'wendy');
        if (e.code === 'KeyQ') this.onAction('cycleChar');
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  _bindMouse() {
    // Clic izquierdo sobre el lienzo del juego realiza ataque / acción
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.onAction('attack');
      }
    });
  }

  _bindTouchUI() {
    // Cruceta direccional táctil
    const dpadBtns = document.querySelectorAll('.dpad-btn');
    dpadBtns.forEach((btn) => {
      const dir = btn.dataset.dir;
      const press = (e) => {
        e.preventDefault();
        this.touchDir[dir] = true;
        btn.classList.add('pressed');
      };
      const release = (e) => {
        e.preventDefault();
        this.touchDir[dir] = false;
        btn.classList.remove('pressed');
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('pointercancel', release);
    });

    // Botones de acción táctiles
    const bindActionBtn = (id, actionName) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.classList.add('pressed');
        this.onAction(actionName);
      });
      const unpress = () => el.classList.remove('pressed');
      el.addEventListener('pointerup', unpress);
      el.addEventListener('pointercancel', unpress);
      el.addEventListener('pointerleave', unpress);
    };

    bindActionBtn('touch-jump', 'jump');
    bindActionBtn('touch-attack', 'attack');
    bindActionBtn('touch-interact', 'interact');
    bindActionBtn('touch-swap', 'cycleChar');
  }

  getMoveVector() {
    let x = 0;
    let z = 0;

    if (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchDir.left) x -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchDir.right) x += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW'] || this.touchDir.up) z -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS'] || this.touchDir.down) z += 1;

    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }
}
