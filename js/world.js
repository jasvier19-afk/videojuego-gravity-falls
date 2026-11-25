/**
 * Gravity Falls 3D - Constructor del Mundo, Escenarios, Misterios y Enemigos
 */
class GravityFallsWorld {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];      // Plataformas y obstáculos sólidos { minX, maxX, minY, maxY, minZ, maxZ, mesh, moving? }
    this.collectibles = [];   // Monedas, Páginas del Diario, Snacks de salud
    this.enemies = [];        // Gnomos, Murciélagos Ojo, Guardián del Portal
    this.interactables = [];  // Tótems, Cristales del Zodíaco, NPCs/Carteles
    this.movingPlatforms = [];
    this.decorAnimated = [];  // Cristales flotantes, portal giratorio

    // Materiales compartidos para optimizar rendimiento
    this.mats = {
      grass: new THREE.MeshToonMaterial({ color: 0x2d7a47 }),
      dirt: new THREE.MeshToonMaterial({ color: 0x6b4423 }),
      wood: new THREE.MeshToonMaterial({ color: 0x7c4a24 }),
      woodDark: new THREE.MeshToonMaterial({ color: 0x4a2912 }),
      roof: new THREE.MeshToonMaterial({ color: 0x3b2d38 }),
      stone: new THREE.MeshToonMaterial({ color: 0x64748b }),
      stoneMystic: new THREE.MeshToonMaterial({ color: 0x475569 }),
      pine: new THREE.MeshToonMaterial({ color: 0x165b33 }),
      pineLight: new THREE.MeshToonMaterial({ color: 0x228b4e }),
      gold: new THREE.MeshToonMaterial({ color: 0xfacc15, emissive: 0x664d00 }),
      cyanGlow: new THREE.MeshToonMaterial({ color: 0x38bdf8, emissive: 0x0369a1 }),
      purpleGlow: new THREE.MeshToonMaterial({ color: 0xc084fc, emissive: 0x581c87 }),
      redHat: new THREE.MeshToonMaterial({ color: 0xdc2626 }),
      white: new THREE.MeshToonMaterial({ color: 0xf8fafc })
    };

    this.bridgePlatform = null;
    this.portalRing = null;
    this.portalCore = null;
  }

  build() {
    this._buildSkyAndMountains();
    this._buildZone1MysteryShack();
    this._buildZone2WhisperingWoods();
    this._buildZone3SupernaturalSummit();
    return {
      colliders: this.colliders,
      collectibles: this.collectibles,
      enemies: this.enemies,
      interactables: this.interactables,
      movingPlatforms: this.movingPlatforms
    };
  }

  _addBoxPlatform(x, y, z, w, h, d, material, receiveShadow = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = receiveShadow;
    mesh.castShadow = true;
    this.scene.add(mesh);

    const collider = {
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y - h / 2,
      maxY: y + h / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      mesh,
      w, h, d
    };
    this.colliders.push(collider);
    return collider;
  }

  _addTree(x, y, z, scale = 1) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32 * scale, 0.45 * scale, 2.4 * scale, 7),
      this.mats.woodDark
    );
    trunk.position.y = 1.2 * scale;
    trunk.castShadow = true;
    group.add(trunk);

    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry((2.1 - i * 0.42) * scale, (2.6 - i * 0.25) * scale, 7),
        i % 2 === 0 ? this.mats.pine : this.mats.pineLight
      );
      cone.position.y = (2.7 + i * 1.45) * scale;
      cone.castShadow = true;
      group.add(cone);
    }

    group.position.set(x, y, z);
    this.scene.add(group);
  }

  _addCoin(x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.14, 12),
      this.mats.gold
    );
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.collectibles.push({
      type: 'coin',
      mesh,
      baseY: y,
      collected: false,
      radius: 1.05
    });
  }

  _addJournalPage(x, y, z, id, title) {
    const group = new THREE.Group();
    const page = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.95, 0.1),
      new THREE.MeshToonMaterial({ color: 0xfef08a, emissive: 0x713f12 })
    );
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.38, 0.13),
      new THREE.MeshToonMaterial({ color: 0xb45309 })
    );
    group.add(page, hand);
    group.position.set(x, y, z);
    this.scene.add(group);

    this.collectibles.push({
      type: 'page',
      id,
      title,
      mesh: group,
      baseY: y,
      collected: false,
      radius: 1.35
    });
  }

  _addHeart(x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      new THREE.MeshToonMaterial({ color: 0xf43f5e, emissive: 0x881337 })
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.collectibles.push({
      type: 'heart',
      mesh,
      baseY: y,
      collected: false,
      radius: 1.1
    });
  }

  _addEnemy(type, x, y, z, patrolRange = 4) {
    const group = new THREE.Group();
    let hp = 2;
    let speed = 2.6;
    let scoreValue = 100;

    if (type === 'gnome') {
      // Gnomo clásico de Gravity Falls con gorro rojo alto y barba blanca
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.55), new THREE.MeshToonMaterial({ color: 0x2563eb }));
      body.position.y = 0.35;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.5), new THREE.MeshToonMaterial({ color: 0xffd7b5 }));
      head.position.y = 0.85;
      const beard = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 5), this.mats.white);
      beard.rotation.x = Math.PI;
      beard.position.set(0, 0.65, 0.2);
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.9, 7), this.mats.redHat);
      hat.position.y = 1.45;
      group.add(body, head, beard, hat);
    } else if (type === 'eyebat') {
      hp = 2;
      speed = 3.5;
      scoreValue = 150;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 12), this.mats.white);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), new THREE.MeshToonMaterial({ color: 0xdc2626 }));
      iris.position.z = 0.36;
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.45), new THREE.MeshToonMaterial({ color: 0x312e81 }));
      wingL.position.set(-0.75, 0.1, 0);
      const wingR = wingL.clone();
      wingR.position.x = 0.75;
      group.add(eye, iris, wingL, wingR);
    } else if (type === 'guardian') {
      hp = 6;
      speed = 3.2;
      scoreValue = 500;
      const pyramid = new THREE.Mesh(
        new THREE.ConeGeometry(1.35, 2.2, 4),
        new THREE.MeshToonMaterial({ color: 0xfacc15, emissive: 0x854d0e })
      );
      pyramid.position.y = 1.4;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 12), this.mats.white);
      eye.position.set(0, 1.4, 0.65);
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.7, 8), new THREE.MeshToonMaterial({ color: 0x111827 }));
      hat.position.y = 2.8;
      group.add(pyramid, eye, hat);
    }

    group.position.set(x, y, z);
    this.scene.add(group);

    this.enemies.push({
      type,
      mesh: group,
      startX: x,
      startY: y,
      startZ: z,
      patrolRange,
      dir: 1,
      hp,
      maxHp: hp,
      speed,
      scoreValue,
      alive: true,
      hurtTimer: 0
    });
  }

  _buildSkyAndMountains() {
    // Montañas distantes estilizadas alrededor del valle
    const mtMat = new THREE.MeshToonMaterial({ color: 0x1e3a2f });
    const mtPositions = [
      [-55, -20, -45, 22, 34], [55, -20, -35, 24, 38],
      [-60, -20, -100, 26, 42], [60, -20, -105, 28, 45],
      [0, -20, -195, 36, 52], [-45, -20, -180, 28, 40], [45, -20, -180, 28, 40]
    ];
    mtPositions.forEach(([x, y, z, r, h]) => {
      const mt = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mtMat);
      mt.position.set(x, y + h / 2, z);
      this.scene.add(mt);
    });
  }

  _buildZone1MysteryShack() {
    // Suelo principal de la Cabaña del Misterio
    this._addBoxPlatform(0, -1, 0, 34, 2, 46, this.mats.grass);

    // La Cabaña del Misterio (lado izquierdo)
    this._addBoxPlatform(-8.5, 2.5, -2, 9, 5, 8, this.mats.wood);
    // Techo inclinado estilizado
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 4.2, 4), this.mats.roof);
    roof.position.set(-8.5, 7.1, -2);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.scene.add(roof);

    // Letrero MISTERIO
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.3, 0.3), this.mats.white);
    signBoard.position.set(-8.5, 5.4, 2.2);
    this.scene.add(signBoard);

    // Porche y escalones hacia el techo
    this._addBoxPlatform(-3.2, 0.6, -2, 2.5, 1.2, 3.2, this.mats.woodDark);
    this._addBoxPlatform(-3.2, 2.0, -5.2, 2.6, 1.2, 2.6, this.mats.woodDark);
    this._addBoxPlatform(-4.8, 3.6, -6.5, 2.6, 1.0, 2.6, this.mats.woodDark);
    this._addBoxPlatform(-8.5, 5.1, -2, 8.6, 0.5, 7.6, this.mats.roof); // Techo caminable

    // Carrito de golf de Stan (obstáculo divertido)
    this._addBoxPlatform(6.5, 0.8, 4, 3.2, 1.6, 2.2, new THREE.MeshToonMaterial({ color: 0xeab308 }));

    // Árboles decorativos
    [[-14, 0, 12], [13, 0, 10], [14, 0, -4], [-14, 0, -15], [13, 0, -16]].forEach(([x, y, z]) => {
      this._addTree(x, y, z, 1.15);
    });

    // Monedas iniciales y Páginas del Diario
    this._addCoin(0, 1.0, 4);
    this._addCoin(3, 1.0, 0);
    this._addCoin(-3.2, 2.2, -2);
    this._addCoin(-3.2, 3.6, -5.2);
    this._addJournalPage(-8.5, 6.4, -2, 'page1', 'Página #1: Los Gnomos del Bosque');
    this._addJournalPage(10.5, 1.2, -13, 'page2', 'Página #2: Secretos de la Cabaña');

    // Gnomo curioso cerca del bosque
    this._addEnemy('gnome', 7, 0, -12, 3.5);

    // Cartel interactivo de inicio
    const totemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 2.4, 8), this.mats.woodDark);
    totemMesh.position.set(4.5, 1.2, 10);
    this.scene.add(totemMesh);
    this.interactables.push({
      id: 'shack_sign',
      type: 'dialogue',
      mesh: totemMesh,
      x: 4.5, y: 1.2, z: 10,
      radius: 2.8,
      triggered: false,
      speaker: 'Stanley Pines',
      portrait: '🎩',
      text: '¡Bienvenidos a la Cabaña del Misterio! Recolecten las Páginas del Diario y detengan el portal en la montaña.'
    });
  }

  _buildZone2WhisperingWoods() {
    // Camino de entrada al bosque
    this._addBoxPlatform(0, -1, -34, 24, 2, 24, this.mats.grass);

    // Plataformas elevadas y hongos gigantes
    this._addBoxPlatform(-6, 1.2, -32, 4.5, 1.2, 4.5, this.mats.wood);
    this._addBoxPlatform(6, 1.8, -37, 4.5, 1.2, 4.5, this.mats.wood);
    this._addBoxPlatform(0, 2.8, -42, 5.0, 1.0, 5.0, this.mats.cyanGlow);

    // Segundo claro del bosque (después del abismo)
    this._addBoxPlatform(0, -1, -67, 26, 2, 26, this.mats.grass);

    // Puente misterioso (inicialmente oculto/bajado hasta activar los 2 tótems de pino)
    this.bridgePlatform = this._addBoxPlatform(0, -8, -50, 5.5, 1.2, 10.5, this.mats.wood);
    this.bridgePlatform.locked = true;

    // Plataforma móvil alternativa para cruzar si el jugador quiere hacer parkour
    const mover = this._addBoxPlatform(-7.5, 0.4, -50, 4.2, 0.9, 4.2, this.mats.pineLight);
    this.movingPlatforms.push({
      collider: mover,
      axis: 'z',
      origin: -50,
      range: 4.5,
      speed: 1.3
    });

    // Tótems del misterio del bosque
    const totemPositions = [
      { id: 'totem1', x: -8.5, y: 1.2, z: -28 },
      { id: 'totem2', x: 8.5, y: 1.2, z: -39 }
    ];
    totemPositions.forEach((t, idx) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 1.2), this.mats.stone);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), this.mats.cyanGlow);
      crystal.position.y = 1.9;
      mesh.add(crystal);
      mesh.position.set(t.x, t.y, t.z);
      this.scene.add(mesh);

      this.interactables.push({
        id: t.id,
        type: 'totem',
        mesh,
        crystal,
        x: t.x, y: t.y, z: t.z,
        radius: 3.0,
        activated: false,
        label: `Tótem del Pino #${idx + 1}`
      });
    });

    // Árboles del bosque
    [[-10, 0, -25], [10, 0, -26], [-11, 0, -40], [11, 0, -42],
     [-11, 0, -60], [11, 0, -62], [-10, 0, -75], [10, 0, -75]].forEach(([x, y, z]) => {
      this._addTree(x, y, z, 1.3);
    });

    // Enemigos y recompensas
    this._addEnemy('gnome', -3, 0, -35, 4);
    this._addEnemy('gnome', 4, 0, -66, 5);
    this._addEnemy('eyebat', -4, 2.2, -72, 4.5);

    this._addCoin(-6, 2.6, -32);
    this._addCoin(6, 3.2, -37);
    this._addHeart(0, 1.2, -62);
    this._addJournalPage(0, 4.2, -42, 'page3', 'Página #3: El Puente de los Tótems');
    this._addJournalPage(-8, 1.2, -72, 'page4', 'Página #4: Murciélagos Ojo');
  }

  _buildZone3SupernaturalSummit() {
    // Escalones de montaña hacia la cima
    this._addBoxPlatform(0, 0.5, -86, 12, 3, 10, this.mats.stone);
    this._addBoxPlatform(-4, 2.4, -95, 7, 1.5, 6, this.mats.stoneMystic);
    this._addBoxPlatform(4, 4.0, -103, 7, 1.5, 6, this.mats.stoneMystic);

    // Plataforma flotante con Página #5
    const floatPlat = this._addBoxPlatform(-7, 5.4, -110, 5.5, 1.2, 5.5, this.mats.purpleGlow);
    this.movingPlatforms.push({
      collider: floatPlat,
      axis: 'y',
      origin: 5.4,
      range: 1.4,
      speed: 1.6
    });
    this._addJournalPage(-7, 7.2, -110, 'page5', 'Página #5: La Grieta Dimensional');

    // Gran Cima Sobrenatural del Portal
    this._addBoxPlatform(0, 4.5, -124, 30, 3, 32, this.mats.stoneMystic);

    // El Portal Sobrenatural (inspirado en el portal triangular)
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 11.5, -135);
    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.4, 0.45, 8, 3),
      new THREE.MeshToonMaterial({ color: 0xfacc15, emissive: 0x713f12 })
    );
    const innerCore = new THREE.Mesh(
      new THREE.CircleGeometry(3.8, 3),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    portalGroup.add(outerRing, innerCore);
    this.scene.add(portalGroup);
    this.portalRing = outerRing;
    this.portalCore = innerCore;

    // 3 Cristales del Zodíaco para sellar el portal
    const crystalCoords = [
      { id: 'c1', x: -9.5, y: 6.8, z: -120 },
      { id: 'c2', x: 9.5, y: 6.8, z: -120 },
      { id: 'c3', x: 0, y: 6.8, z: -130 }
    ];
    crystalCoords.forEach((c, i) => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 1.4, 6), this.mats.stone);
      base.position.set(c.x, c.y, c.z);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), this.mats.purpleGlow);
      gem.position.y = 1.6;
      base.add(gem);
      this.scene.add(base);

      this.interactables.push({
        id: c.id,
        type: 'crystal',
        mesh: base,
        crystal: gem,
        x: c.x, y: c.y, z: c.z,
        radius: 3.2,
        activated: false,
        label: `Cristal del Zodíaco #${i + 1}`
      });
    });

    // Página #6 y Salud
    this._addJournalPage(8, 7.2, -132, 'page6', 'Página #6: El Secreto de Bill');
    this._addHeart(-8, 7.0, -132);
    this._addCoin(-4, 4.0, -95);
    this._addCoin(4, 5.6, -103);

    // Enemigos finales
    this._addEnemy('eyebat', -6, 8.0, -124, 5);
    this._addEnemy('eyebat', 6, 8.0, -124, 5);
    this._addEnemy('guardian', 0, 6.0, -126, 6);
  }

  unlockBridge() {
    if (!this.bridgePlatform || !this.bridgePlatform.locked) return;
    this.bridgePlatform.locked = false;
    const p = this.bridgePlatform;
    p.mesh.position.y = -0.6;
    p.minY = -0.6 - p.h / 2;
    p.maxY = -0.6 + p.h / 2;
  }

  update(dt, time) {
    // Plataformas móviles
    for (const mp of this.movingPlatforms) {
      const offset = Math.sin(time * mp.speed) * mp.range;
      const c = mp.collider;
      if (mp.axis === 'z') {
        const nz = mp.origin + offset;
        c.mesh.position.z = nz;
        c.minZ = nz - c.d / 2;
        c.maxZ = nz + c.d / 2;
      } else if (mp.axis === 'y') {
        const ny = mp.origin + offset;
        c.mesh.position.y = ny;
        c.minY = ny - c.h / 2;
        c.maxY = ny + c.h / 2;
      }
    }

    // Coleccionables flotando
    for (const item of this.collectibles) {
      if (item.collected) continue;
      item.mesh.rotation.y += dt * 2.2;
      item.mesh.position.y = item.baseY + Math.sin(time * 3 + item.mesh.position.x) * 0.22;
    }

    // Portal giratorio
    if (this.portalRing) {
      this.portalRing.rotation.z += dt * 0.7;
      this.portalCore.rotation.z -= dt * 1.1;
    }
  }
}
