/**
 * Gravity Falls 3D - Motor Principal del Juego
 */
(function () {
  const canvas = document.getElementById('game-canvas');
  const hudEl = document.getElementById('hud');
  const startScreen = document.getElementById('start-screen');
  const pauseScreen = document.getElementById('pause-screen');
  const endScreen = document.getElementById('end-screen');
  const dialogueBox = document.getElementById('dialogue-box');
  const interactPrompt = document.getElementById('interact-prompt');

  // Estado global del juego
  const gameState = {
    mode: 'menu', // menu | playing | paused | dialogue | ended
    activeCharId: 'dipper',
    health: 5,
    maxHealth: 5,
    score: 0,
    pagesFound: 0,
    totalPages: 6,
    totemsActivated: 0,
    crystalsActivated: 0,
    guardianDefeated: false,
    zoneAnnounced: { woods: false, summit: false },
    quality: 'medium'
  };

  // Escena, Cámara y Renderizador Three.js
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7ec8e3);
  scene.fog = new THREE.FogExp2(0x7ec8e3, 0.0095);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 260);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputEncoding = THREE.sRGBEncoding;

  function applyQualitySettings(q) {
    gameState.quality = q;
    const maxDpr = q === 'high' ? 2 : q === 'medium' ? 1.5 : 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.shadowMap.enabled = q !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  applyQualitySettings('medium');

  // Iluminación estilizada estilo serie animada
  const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0x1e3a2f, 0.9);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfff1c9, 1.05);
  dirLight.position.set(22, 36, 18);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 5;
  dirLight.shadow.camera.far = 140;
  const d = 45;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  // Construir mundo 3D
  let world = new GravityFallsWorld(scene);
  let worldData = world.build();

  // Crear los 4 personajes jugables (se muestra el activo)
  const charRigs = {};
  Object.keys(CHARACTER_DATA).forEach((id) => {
    const rig = createCharacterMesh(id);
    rig.root.visible = id === gameState.activeCharId;
    scene.add(rig.root);
    charRigs[id] = rig;
  });

  // Física del jugador
  const player = {
    x: 0,
    y: 0.5,
    z: 14,
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 0.45,
    height: 1.8,
    facing: Math.PI, // mirando hacia -Z (hacia el bosque)
    isGrounded: false,
    jumpsUsed: 0,
    coyoteTimer: 0,
    attackTimer: 0,
    attackCooldown: 0,
    hurtTimer: 0,
    checkpoint: { x: 0, y: 0.5, z: 14 }
  };

  // Diálogo
  let dialogueQueue = [];
  function showDialogue(lines) {
    dialogueQueue = lines.slice();
    if (dialogueQueue.length === 0) return;
    gameState.mode = 'dialogue';
    renderNextDialogue();
  }

  function renderNextDialogue() {
    if (dialogueQueue.length === 0) {
      dialogueBox.classList.add('hidden');
      if (gameState.mode === 'dialogue') gameState.mode = 'playing';
      return;
    }
    const item = dialogueQueue.shift();
    document.getElementById('dialogue-speaker').textContent = item.speaker;
    document.getElementById('dialogue-portrait').textContent = item.portrait;
    document.getElementById('dialogue-text').textContent = item.text;
    dialogueBox.classList.remove('hidden');
  }

  document.getElementById('dialogue-next').addEventListener('click', () => {
    renderNextDialogue();
  });

  // Cambio de personaje
  function switchCharacter(charId) {
    if (!CHARACTER_DATA[charId] || gameState.activeCharId === charId) return;
    charRigs[gameState.activeCharId].root.visible = false;
    gameState.activeCharId = charId;
    const newRig = charRigs[charId];
    newRig.root.visible = true;
    newRig.root.position.set(player.x, player.y, player.z);
    newRig.root.rotation.y = player.facing;
    window.soundManager.playSwitch();
    updateHUD();
  }

  function cycleCharacter() {
    const order = ['dipper', 'mabel', 'stan', 'wendy'];
    const nextIdx = (order.indexOf(gameState.activeCharId) + 1) % order.length;
    switchCharacter(order[nextIdx]);
  }

  // Acciones del jugador
  function handlePlayerAction(action, payload) {
    if (action === 'pause') {
      if (gameState.mode === 'playing') {
        gameState.mode = 'paused';
        pauseScreen.classList.remove('hidden');
      } else if (gameState.mode === 'paused') {
        gameState.mode = 'playing';
        pauseScreen.classList.add('hidden');
      }
      return;
    }

    if (gameState.mode === 'dialogue') {
      if (action === 'jump' || action === 'interact' || action === 'attack') {
        renderNextDialogue();
      }
      return;
    }

    if (gameState.mode !== 'playing') return;

    const charStats = CHARACTER_DATA[gameState.activeCharId];

    if (action === 'jump') {
      if (player.isGrounded || player.coyoteTimer > 0) {
        player.vy = charStats.jumpPower;
        player.isGrounded = false;
        player.coyoteTimer = 0;
        player.jumpsUsed = 1;
        window.soundManager.playJump();
      } else if (player.jumpsUsed < charStats.maxJumps) {
        player.vy = charStats.jumpPower * 0.95;
        player.jumpsUsed++;
        window.soundManager.playJump();
      }
    } else if (action === 'attack') {
      if (player.attackCooldown <= 0) {
        player.attackTimer = 0.28;
        player.attackCooldown = 0.36;
        window.soundManager.playAttack();
        performAttack(charStats);
      }
    } else if (action === 'interact') {
      triggerNearestInteractable();
    } else if (action === 'switchChar') {
      switchCharacter(payload);
    } else if (action === 'cycleChar') {
      cycleCharacter();
    }
  }

  const input = new InputManager(canvas, handlePlayerAction);

  function performAttack(charStats) {
    const range = charStats.attackRange;
    for (const enemy of worldData.enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.mesh.position.x - player.x;
      const dy = enemy.mesh.position.y - player.y;
      const dz = enemy.mesh.position.z - player.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= range && Math.abs(dy) < 2.4) {
        enemy.hp -= charStats.damage;
        enemy.hurtTimer = 0.28;
        // Empuje
        const len = Math.max(0.1, dist);
        enemy.mesh.position.x += (dx / len) * 1.1;
        enemy.mesh.position.z += (dz / len) * 1.1;

        if (enemy.hp <= 0) {
          enemy.alive = false;
          enemy.mesh.visible = false;
          gameState.score += enemy.scoreValue;
          if (enemy.type === 'guardian') {
            gameState.guardianDefeated = true;
            checkVictory();
          }
          updateHUD();
        }
      }
    }
  }

  function getNearestInteractable() {
    let best = null;
    let bestDist = Infinity;
    for (const obj of worldData.interactables) {
      if (obj.activated) continue;
      const dist = Math.hypot(obj.x - player.x, obj.z - player.z);
      if (dist <= obj.radius && Math.abs(obj.y - player.y) < 3.0 && dist < bestDist) {
        best = obj;
        bestDist = dist;
      }
    }
    return best;
  }

  function triggerNearestInteractable() {
    const obj = getNearestInteractable();
    if (!obj) return;

    if (obj.type === 'dialogue') {
      showDialogue([{ speaker: obj.speaker, portrait: obj.portrait, text: obj.text }]);
    } else if (obj.type === 'totem') {
      obj.activated = true;
      obj.crystal.material = world.mats.gold;
      gameState.totemsActivated++;
      gameState.score += 200;
      window.soundManager.playPuzzle();
      if (gameState.totemsActivated >= 2) {
        world.unlockBridge();
        showDialogue([
          {
            speaker: 'Dipper Pines',
            portrait: '🌲',
            text: '¡Lo logramos! Los 2 tótems activaron el puente mágico hacia la Montaña Sobrenatural.'
          }
        ]);
      }
      updateHUD();
    } else if (obj.type === 'crystal') {
      obj.activated = true;
      obj.crystal.material = world.mats.gold;
      gameState.crystalsActivated++;
      gameState.score += 300;
      window.soundManager.playPuzzle();
      updateHUD();
      checkVictory();
    }
  }

  function checkVictory() {
    if (gameState.crystalsActivated >= 3 && gameState.guardianDefeated) {
      gameState.mode = 'ended';
      window.soundManager.playVictory();
      document.getElementById('end-badge').textContent = '¡MISTERIO RESUELTO!';
      document.getElementById('end-title').textContent = '¡Portal Sellado!';
      document.getElementById('end-desc').textContent =
        'Dipper, Mabel, Stanley y Wendy derrotaron al Guardián y cerraron la grieta dimensional de Gravity Falls.';
      document.getElementById('final-score').textContent = gameState.score;
      document.getElementById('final-pages').textContent = `${gameState.pagesFound}/${gameState.totalPages}`;
      endScreen.classList.remove('hidden');
    }
  }

  function triggerGameOver() {
    gameState.mode = 'ended';
    document.getElementById('end-badge').textContent = '¡CUIDADO EN EL BOSQUE!';
    document.getElementById('end-title').textContent = '¡Atrapados por el Misterio!';
    document.getElementById('end-desc').textContent =
      'Las criaturas sobrenaturales fueron demasiado fuertes esta vez. ¡Inténtalo de nuevo!';
    document.getElementById('final-score').textContent = gameState.score;
    document.getElementById('final-pages').textContent = `${gameState.pagesFound}/${gameState.totalPages}`;
    endScreen.classList.remove('hidden');
  }

  function updateHUD() {
    const c = CHARACTER_DATA[gameState.activeCharId];
    const avatar = document.getElementById('char-avatar');
    avatar.textContent = c.avatarText;
    avatar.className = `char-avatar ${c.avatarClass}`;
    document.getElementById('char-name').textContent = c.name;
    document.getElementById('char-ability').textContent = c.ability;

    const hb = document.getElementById('health-bar');
    hb.innerHTML = '❤️'.repeat(Math.max(0, gameState.health)) + '🖤'.repeat(Math.max(0, gameState.maxHealth - gameState.health));

    document.getElementById('pages-count').textContent = `${gameState.pagesFound}/${gameState.totalPages}`;
    document.getElementById('score-count').textContent = gameState.score;

    // Objetivo dinámico
    let objText = 'Explora la Cabaña y busca Páginas del Diario';
    if (player.z < -20 && gameState.totemsActivated < 2) {
      objText = `Activa los Tótems del Bosque (${gameState.totemsActivated}/2)`;
    } else if (player.z < -45 && player.z > -90) {
      objText = 'Cruza el bosque y sube a la Montaña Sobrenatural';
    } else if (player.z <= -90) {
      objText = `Activa Cristales (${gameState.crystalsActivated}/3) y vence al Guardián`;
    }
    document.getElementById('objective-text').textContent = objText;

    document.querySelectorAll('.switch-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.char === gameState.activeCharId);
    });
  }

  // Botones UI
  document.querySelectorAll('.switch-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchCharacter(btn.dataset.char));
  });

  document.querySelectorAll('.hero-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.hero-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      switchCharacter(chip.dataset.pick);
    });
  });

  document.getElementById('btn-audio').addEventListener('click', (e) => {
    const muted = window.soundManager.toggleMute();
    e.currentTarget.textContent = muted ? '🔇' : '🔊';
  });

  document.getElementById('btn-touch-toggle').addEventListener('click', () => {
    input.toggleTouchControls();
  });

  document.getElementById('btn-pause').addEventListener('click', () => handlePlayerAction('pause'));
  document.getElementById('btn-resume').addEventListener('click', () => handlePlayerAction('pause'));

  function startOrRestartGame() {
    // Reiniciar estado
    gameState.health = 5;
    gameState.score = 0;
    gameState.pagesFound = 0;
    gameState.totemsActivated = 0;
    gameState.crystalsActivated = 0;
    gameState.guardianDefeated = false;
    gameState.zoneAnnounced = { woods: false, summit: false };

    player.x = 0;
    player.y = 0.5;
    player.z = 14;
    player.vx = 0;
    player.vy = 0;
    player.vz = 0;
    player.checkpoint = { x: 0, y: 0.5, z: 14 };

    // Restaurar coleccionables, enemigos e interactuables
    worldData.collectibles.forEach((c) => {
      c.collected = false;
      c.mesh.visible = true;
    });
    worldData.enemies.forEach((e) => {
      e.alive = true;
      e.hp = e.maxHp;
      e.mesh.visible = true;
      e.mesh.position.set(e.startX, e.startY, e.startZ);
    });
    worldData.interactables.forEach((obj) => {
      obj.activated = false;
      if (obj.type === 'totem') obj.crystal.material = world.mats.cyanGlow;
      if (obj.type === 'crystal') obj.crystal.material = world.mats.purpleGlow;
    });
    if (world.bridgePlatform) {
      world.bridgePlatform.locked = true;
      world.bridgePlatform.mesh.position.y = -8;
      world.bridgePlatform.minY = -8 - world.bridgePlatform.h / 2;
      world.bridgePlatform.maxY = -8 + world.bridgePlatform.h / 2;
    }

    applyQualitySettings(document.getElementById('quality-select').value);
    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    hudEl.classList.remove('hidden');

    window.soundManager.startMusic();
    updateHUD();

    showDialogue([
      {
        speaker: 'Dipper Pines',
        portrait: '🌲',
        text: '¡Mabel, el Diario #3 detecta energía anómala en la cima de Gravity Falls!'
      },
      {
        speaker: 'Mabel Pines',
        portrait: '🌠',
        text: '¡El Tío Stan y Wendy también vienen! Usa 1-4 (o el botón Héroe) para cambiar de personaje cuando quieras.'
      }
    ]);
  }

  document.getElementById('btn-start').addEventListener('click', startOrRestartGame);
  document.getElementById('btn-restart-pause').addEventListener('click', startOrRestartGame);
  document.getElementById('btn-play-again').addEventListener('click', startOrRestartGame);

  // Ajuste responsivo de pantalla y cámara
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    camera.aspect = aspect;
    // En móviles verticales ampliamos ligeramente el FOV para mejor visibilidad
    camera.fov = aspect < 0.85 ? 72 : 60;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Física y detección de colisiones AABB
  function updatePlayerPhysics(dt) {
    const charStats = CHARACTER_DATA[gameState.activeCharId];
    const move = input.getMoveVector();

    player.vx = move.x * charStats.speed;
    player.vz = move.z * charStats.speed;

    if (Math.abs(move.x) > 0.05 || Math.abs(move.z) > 0.05) {
      player.facing = Math.atan2(move.x, move.z);
    }

    // Gravedad
    player.vy -= 28 * dt;
    if (player.vy < -26) player.vy = -26;

    // Movimiento horizontal X y colisión
    player.x += player.vx * dt;
    for (const c of worldData.colliders) {
      if (c.locked) continue;
      if (
        player.y + player.height > c.minY + 0.15 &&
        player.y < c.maxY - 0.15 &&
        player.z + player.radius > c.minZ &&
        player.z - player.radius < c.maxZ
      ) {
        if (player.x + player.radius > c.minX && player.x - player.radius < c.maxX) {
          if (player.vx > 0) player.x = c.minX - player.radius;
          else if (player.vx < 0) player.x = c.maxX + player.radius;
        }
      }
    }

    // Movimiento horizontal Z y colisión
    player.z += player.vz * dt;
    for (const c of worldData.colliders) {
      if (c.locked) continue;
      if (
        player.y + player.height > c.minY + 0.15 &&
        player.y < c.maxY - 0.15 &&
        player.x + player.radius > c.minX &&
        player.x - player.radius < c.maxX
      ) {
        if (player.z + player.radius > c.minZ && player.z - player.radius < c.maxZ) {
          if (player.vz > 0) player.z = c.minZ - player.radius;
          else if (player.vz < 0) player.z = c.maxZ + player.radius;
        }
      }
    }

    // Movimiento vertical Y y colisión
    const prevGrounded = player.isGrounded;
    player.isGrounded = false;
    player.y += player.vy * dt;

    for (const c of worldData.colliders) {
      if (c.locked) continue;
      if (
        player.x + player.radius > c.minX &&
        player.x - player.radius < c.maxX &&
        player.z + player.radius > c.minZ &&
        player.z - player.radius < c.maxZ
      ) {
        if (player.vy <= 0 && player.y <= c.maxY && player.y >= c.maxY - 1.2) {
          player.y = c.maxY;
          player.vy = 0;
          player.isGrounded = true;
          player.jumpsUsed = 0;
        } else if (player.vy > 0 && player.y + player.height >= c.minY && player.y < c.minY) {
          player.y = c.minY - player.height;
          player.vy = 0;
        }
      }
    }

    if (player.isGrounded) {
      player.coyoteTimer = 0.12;
      // Guardar punto seguro
      if (player.z < -60 && player.checkpoint.z > -60) player.checkpoint = { x: 0, y: 1.5, z: -60 };
      if (player.z < -115 && player.checkpoint.z > -115) player.checkpoint = { x: 0, y: 7.0, z: -118 };
    } else if (prevGrounded) {
      player.coyoteTimer = 0.12;
    } else {
      player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
    }

    // Caída al vacío -> reaparecer en último checkpoint
    if (player.y < -14) {
      player.x = player.checkpoint.x;
      player.y = player.checkpoint.y + 1;
      player.z = player.checkpoint.z;
      player.vy = 0;
      damagePlayer(1);
    }

    // Narrativa por zonas
    if (player.z < -22 && !gameState.zoneAnnounced.woods) {
      gameState.zoneAnnounced.woods = true;
      updateHUD();
      showDialogue([
        {
          speaker: 'Wendy Corduroy',
          portrait: '🪓',
          text: 'Entramos al Bosque de los Susurros. ¡Activa los 2 Tótems de Pino con E o el botón Usar para bajar el puente!'
        }
      ]);
    }
    if (player.z < -114 && !gameState.zoneAnnounced.summit) {
      gameState.zoneAnnounced.summit = true;
      updateHUD();
      showDialogue([
        {
          speaker: 'Stanley Pines',
          portrait: '🎩',
          text: '¡Llegamos a la cima! Activen los 3 Cristales del Zodíaco y derroten al Guardián del Triángulo.'
        }
      ]);
    }
  }

  function damagePlayer(amount) {
    if (player.hurtTimer > 0 || gameState.mode !== 'playing') return;
    gameState.health -= amount;
    player.hurtTimer = 1.1;
    window.soundManager.playHurt();
    updateHUD();
    if (gameState.health <= 0) {
      triggerGameOver();
    }
  }

  function updateCollectibles() {
    for (const item of worldData.collectibles) {
      if (item.collected) continue;
      const dist = Math.hypot(
        item.mesh.position.x - player.x,
        item.mesh.position.y - (player.y + 0.8),
        item.mesh.position.z - player.z
      );
      if (dist < item.radius) {
        item.collected = true;
        item.mesh.visible = false;
        if (item.type === 'coin') {
          gameState.score += 50;
          window.soundManager.playCoin();
        } else if (item.type === 'page') {
          gameState.pagesFound++;
          gameState.score += 250;
          window.soundManager.playPage();
        } else if (item.type === 'heart') {
          gameState.health = Math.min(gameState.maxHealth, gameState.health + 1);
          window.soundManager.playCoin();
        }
        updateHUD();
      }
    }
  }

  function updateEnemies(dt, time) {
    for (const enemy of worldData.enemies) {
      if (!enemy.alive) continue;

      if (enemy.hurtTimer > 0) {
        enemy.hurtTimer -= dt;
      }

      // Patrulla simple o persecución suave si el jugador está cerca
      const distToPlayer = Math.hypot(
        enemy.mesh.position.x - player.x,
        enemy.mesh.position.z - player.z
      );

      if (distToPlayer < 10 && Math.abs(enemy.mesh.position.y - player.y) < 3) {
        const dx = player.x - enemy.mesh.position.x;
        const dz = player.z - enemy.mesh.position.z;
        const len = Math.max(0.01, Math.hypot(dx, dz));
        enemy.mesh.position.x += (dx / len) * enemy.speed * dt;
        enemy.mesh.position.z += (dz / len) * enemy.speed * dt;
        enemy.mesh.rotation.y = Math.atan2(dx, dz);
      } else {
        enemy.mesh.position.x += enemy.dir * enemy.speed * 0.65 * dt;
        if (Math.abs(enemy.mesh.position.x - enemy.startX) > enemy.patrolRange) {
          enemy.dir *= -1;
        }
        enemy.mesh.rotation.y = enemy.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      if (enemy.type === 'eyebat' || enemy.type === 'guardian') {
        enemy.mesh.position.y = enemy.startY + Math.sin(time * 4 + enemy.startX) * 0.35;
      }

      // Colisión enemigo -> jugador
      if (distToPlayer < 1.15 && Math.abs(enemy.mesh.position.y - player.y) < 1.5) {
        damagePlayer(1);
      }
    }
  }

  // Cámara en tercera persona suave
  const camTarget = new THREE.Vector3();
  const camDesired = new THREE.Vector3();

  function updateCamera(dt) {
    const isPortrait = window.innerWidth < window.innerHeight;
    const distBack = isPortrait ? 11.5 : 9.2;
    const heightUp = isPortrait ? 6.4 : 5.2;

    camDesired.set(player.x, player.y + heightUp, player.z + distBack);
    camera.position.lerp(camDesired, 1 - Math.exp(-7 * dt));

    camTarget.set(player.x, player.y + 1.4, player.z - 2.0);
    camera.lookAt(camTarget);
  }

  // Bucle principal
  let lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    const time = now / 1000;

    world.update(dt, time);

    if (gameState.mode === 'playing') {
      if (player.attackTimer > 0) player.attackTimer = Math.max(0, player.attackTimer - dt);
      if (player.attackCooldown > 0) player.attackCooldown = Math.max(0, player.attackCooldown - dt);
      if (player.hurtTimer > 0) player.hurtTimer = Math.max(0, player.hurtTimer - dt);

      updatePlayerPhysics(dt);
      updateCollectibles();
      updateEnemies(dt, time);

      // Prompt contextual de interacción
      const near = getNearestInteractable();
      if (near) {
        interactPrompt.classList.remove('hidden');
      } else {
        interactPrompt.classList.add('hidden');
      }
    }

    // Actualizar malla y animación del héroe activo
    const rig = charRigs[gameState.activeCharId];
    rig.root.position.set(player.x, player.y, player.z);
    rig.root.rotation.y = player.facing;
    animateCharacterRig(rig, dt, {
      isMoving: Math.hypot(player.vx, player.vz) > 0.4,
      isGrounded: player.isGrounded,
      attackTimer: player.attackTimer,
      hurtTimer: player.hurtTimer,
      time
    });

    updateCamera(dt);
    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
