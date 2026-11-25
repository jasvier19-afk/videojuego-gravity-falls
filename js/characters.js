/**
 * Gravity Falls 3D - Constructores y Animación de Personajes
 * Dipper Pines, Mabel Pines, Stanley Pines y Wendy Corduroy
 */
const CHARACTER_DATA = {
  dipper: {
    id: 'dipper',
    name: 'Dipper Pines',
    avatarText: 'D',
    avatarClass: 'char-dipper',
    ability: 'Linterna UV & Diario #3',
    speed: 9.2,
    jumpPower: 12.6,
    maxJumps: 1,
    damage: 1,
    attackRange: 2.5,
    accentColor: 0x3b82f6
  },
  mabel: {
    id: 'mabel',
    name: 'Mabel Pines',
    avatarText: 'M',
    avatarClass: 'char-mabel',
    ability: 'Gancho de Agarre (Doble Salto)',
    speed: 9.0,
    jumpPower: 12.2,
    maxJumps: 2,
    damage: 1,
    attackRange: 2.8,
    accentColor: 0xec4899
  },
  stan: {
    id: 'stan',
    name: 'Stanley Pines',
    avatarText: 'S',
    avatarClass: 'char-stan',
    ability: 'Bastón Bola 8 (Golpe Fuerte)',
    speed: 7.8,
    jumpPower: 11.4,
    maxJumps: 1,
    damage: 2,
    attackRange: 3.0,
    accentColor: 0xf59e0b
  },
  wendy: {
    id: 'wendy',
    name: 'Wendy Corduroy',
    avatarText: 'W',
    avatarClass: 'char-wendy',
    ability: 'Hacha & Agilidad Leñadora',
    speed: 10.8,
    jumpPower: 13.4,
    maxJumps: 1,
    damage: 2,
    attackRange: 2.9,
    accentColor: 0x22c55e
  }
};

function makeCartoonMat(color, emissive = 0x000000) {
  return new THREE.MeshToonMaterial({ color, emissive });
}

function createCharacterMesh(charId) {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = makeCartoonMat(0xffd7b5);
  const darkMat = makeCartoonMat(0x23232e);
  const whiteMat = makeCartoonMat(0xffffff);

  // Sombra de contacto en el suelo (ligera y rápida)
  const shadowGeo = new THREE.CircleGeometry(0.55, 16);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.28,
    depthWrite: false
  });
  const blobShadow = new THREE.Mesh(shadowGeo, shadowMat);
  blobShadow.rotation.x = -Math.PI / 2;
  blobShadow.position.y = 0.03;
  root.add(blobShadow);

  // Piernas
  const legGeo = new THREE.BoxGeometry(0.24, 0.55, 0.24);
  const leftLeg = new THREE.Mesh(legGeo, darkMat);
  leftLeg.position.set(-0.18, 0.28, 0);
  const rightLeg = new THREE.Mesh(legGeo, darkMat);
  rightLeg.position.set(0.18, 0.28, 0);
  bodyGroup.add(leftLeg, rightLeg);

  // Torso
  let torsoColor = 0x2563eb;
  let torsoHeight = 0.72;
  if (charId === 'mabel') torsoColor = 0xec4899;
  if (charId === 'stan') { torsoColor = 0x1f2937; torsoHeight = 0.85; }
  if (charId === 'wendy') { torsoColor = 0x15803d; torsoHeight = 0.82; }

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, torsoHeight, 0.42),
    makeCartoonMat(torsoColor)
  );
  torso.position.y = 0.55 + torsoHeight / 2;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Brazos
  const armGeo = new THREE.BoxGeometry(0.2, 0.58, 0.2);
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.46, 0.55 + torsoHeight - 0.1, 0);
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.y = -0.24;
  leftArmPivot.add(leftArm);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.46, 0.55 + torsoHeight - 0.1, 0);
  const rightArm = new THREE.Mesh(armGeo, skinMat);
  rightArm.position.y = -0.24;
  rightArmPivot.add(rightArm);

  bodyGroup.add(leftArmPivot, rightArmPivot);

  // Cabeza
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.55 + torsoHeight + 0.34;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.58, 0.58), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Ojos caricaturescos
  const eyeGeo = new THREE.BoxGeometry(0.1, 0.12, 0.06);
  const pupilGeo = new THREE.BoxGeometry(0.05, 0.06, 0.07);
  [-0.14, 0.14].forEach((ex) => {
    const eye = new THREE.Mesh(eyeGeo, whiteMat);
    eye.position.set(ex, 0.04, 0.28);
    const pupil = new THREE.Mesh(pupilGeo, darkMat);
    pupil.position.set(ex, 0.04, 0.295);
    headGroup.add(eye, pupil);
  });

  // Detalles únicos por personaje
  if (charId === 'dipper') {
    // Camiseta naranja bajo el chaleco azul
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.66, 0.44), makeCartoonMat(0xea580c));
    shirt.position.y = torso.position.y;
    bodyGroup.add(shirt);

    // Gorra blanca y azul con visera + símbolo pino
    const capBase = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.24, 0.62), makeCartoonMat(0x1d4ed8));
    capBase.position.y = 0.28;
    const capFront = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.08), whiteMat);
    capFront.position.set(0, 0.28, 0.29);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.28), makeCartoonMat(0x1d4ed8));
    visor.position.set(0, 0.19, 0.38);
    const pineDot = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 4), makeCartoonMat(0x16a34a));
    pineDot.position.set(0, 0.29, 0.34);
    headGroup.add(capBase, capFront, visor, pineDot);

    // Diario #3 en mano derecha
    const journal = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.08), makeCartoonMat(0x7c2d12));
    journal.position.set(0, -0.5, 0.14);
    const handGold = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.1), makeCartoonMat(0xfacc15));
    handGold.position.set(0, -0.5, 0.15);
    rightArmPivot.add(journal, handGold);
  } else if (charId === 'mabel') {
    // Estrella fugaz en suéter
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), makeCartoonMat(0xfde047));
    star.position.set(0, torso.position.y + 0.05, 0.22);
    bodyGroup.add(star);

    // Cabello largo castaño y diadema rosa
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 0.36), makeCartoonMat(0x5c3317));
    hair.position.set(0, -0.05, -0.16);
    const headband = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.1, 0.62), makeCartoonMat(0xf472b6));
    headband.position.y = 0.24;
    headGroup.add(hair, headband);

    // Gancho de agarre en mano derecha
    const hook = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 4), makeCartoonMat(0x94a3b8));
    hook.rotation.x = Math.PI / 2;
    hook.position.set(0, -0.48, 0.2);
    rightArmPivot.add(hook);
  } else if (charId === 'stan') {
    // Corbata roja y lentes
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.06), makeCartoonMat(0xb91c1c));
    tie.position.set(0, torso.position.y + 0.08, 0.22);
    bodyGroup.add(tie);

    // Fez rojo con borla dorada
    const fez = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.32, 12), makeCartoonMat(0x991b1b));
    fez.position.y = 0.42;
    const fezBand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.06), makeCartoonMat(0xfacc15));
    fezBand.position.set(0, 0.42, 0.22);
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.08), darkMat);
    glasses.position.set(0, 0.04, 0.3);
    headGroup.add(fez, fezBand, glasses);

    // Bastón con bola 8
    const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), makeCartoonMat(0x78350f));
    cane.position.set(0, -0.55, 0.18);
    cane.rotation.x = 0.35;
    const ball8 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), darkMat);
    ball8.position.set(0, -0.25, 0.3);
    rightArmPivot.add(cane, ball8);
  } else if (charId === 'wendy') {
    // Cabello pelirrojo y gorro de leñador verde
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.65, 0.34), makeCartoonMat(0xc2410c));
    hair.position.set(0, -0.04, -0.15);
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.28, 0.64), makeCartoonMat(0x166534));
    hat.position.y = 0.3;
    const fur = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.2), makeCartoonMat(0xd6d3d1));
    fur.position.set(0, 0.24, 0.26);
    headGroup.add(hair, hat, fur);

    // Hacha de utilería
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), makeCartoonMat(0x92400e));
    handle.position.set(0, -0.5, 0.2);
    handle.rotation.x = 0.5;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.26), makeCartoonMat(0xcbd5e1));
    blade.position.set(0, -0.75, 0.42);
    rightArmPivot.add(handle, blade);
  }

  bodyGroup.add(headGroup);

  // Anillo de ataque visual
  const slashGeo = new THREE.RingGeometry(0.6, 1.55, 20, 1, 0, Math.PI * 1.2);
  const slashMat = new THREE.MeshBasicMaterial({
    color: CHARACTER_DATA[charId].accentColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0
  });
  const slashRing = new THREE.Mesh(slashGeo, slashMat);
  slashRing.rotation.x = -Math.PI / 2;
  slashRing.position.y = 0.9;
  root.add(slashRing);

  return {
    root,
    bodyGroup,
    leftLeg,
    rightLeg,
    leftArmPivot,
    rightArmPivot,
    headGroup,
    slashRing,
    slashMat
  };
}

function animateCharacterRig(rig, dt, state) {
  const { isMoving, isGrounded, attackTimer, time, hurtTimer } = state;

  if (isMoving && isGrounded) {
    const swing = Math.sin(time * 13) * 0.65;
    rig.leftLeg.rotation.x = swing;
    rig.rightLeg.rotation.x = -swing;
    rig.leftArmPivot.rotation.x = -swing * 0.8;
    rig.rightArmPivot.rotation.x = swing * 0.8;
    rig.bodyGroup.position.y = Math.abs(Math.sin(time * 13)) * 0.08;
  } else if (!isGrounded) {
    rig.leftLeg.rotation.x = 0.35;
    rig.rightLeg.rotation.x = -0.35;
    rig.leftArmPivot.rotation.x = -0.7;
    rig.rightArmPivot.rotation.x = -0.7;
    rig.bodyGroup.position.y = 0;
  } else {
    // Respiración en reposo
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftArmPivot.rotation.x = Math.sin(time * 2.5) * 0.06;
    rig.rightArmPivot.rotation.x = -Math.sin(time * 2.5) * 0.06;
    rig.bodyGroup.position.y = Math.sin(time * 3) * 0.03;
  }

  // Animación de ataque
  if (attackTimer > 0) {
    const p = 1 - attackTimer / 0.28;
    rig.rightArmPivot.rotation.x = -1.7 + p * 2.4;
    rig.slashRing.rotation.z = p * Math.PI * 2;
    rig.slashMat.opacity = Math.sin(p * Math.PI) * 0.85;
  } else {
    rig.slashMat.opacity = 0;
  }

  // Parpadeo al recibir daño
  rig.bodyGroup.visible = hurtTimer <= 0 || Math.floor(hurtTimer * 18) % 2 === 0;
}
