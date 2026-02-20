// ─── Canvas setup ────────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

canvas.width  = 800;
canvas.height = 560;

// ─── Constants ───────────────────────────────────────────────────────────────
const TS              = 32;
const MAP_W           = 60;
const MAP_H           = 60;
const SPEED           = 1.8;
const ANIM_RATE       = 140;
const ATTACK_DURATION = 380;
const ATTACK_COOLDOWN = 480;
const GOBLIN_COUNT    = 18;
const GOBLIN_SPEED    = 0.55;
const DETECT_RANGE    = 340;
const DEATH_DUR       = 500;

// Tile IDs
const T_GRASS  = 0, T_GRASS2 = 1, T_GRASS3 = 2, T_FLOWER = 3;
const T_TREE   = 4, T_ROCK   = 5, T_WATER  = 6, T_SAND   = 7, T_PATH = 8;

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
const rng = seededRand(42);

// ─── Map generation ──────────────────────────────────────────────────────────
const map = [];

function generateMap() {
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const border = x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1;
      if (border) { map[y][x] = T_TREE; continue; }
      const r = rng();
      if      (r < 0.55) map[y][x] = T_GRASS;
      else if (r < 0.70) map[y][x] = T_GRASS2;
      else if (r < 0.80) map[y][x] = T_GRASS3;
      else if (r < 0.87) map[y][x] = T_FLOWER;
      else if (r < 0.91) map[y][x] = T_TREE;
      else if (r < 0.94) map[y][x] = T_ROCK;
      else if (r < 0.96) map[y][x] = T_SAND;
      else if (r < 0.98) map[y][x] = T_PATH;
      else               map[y][x] = T_WATER;
    }
  }
  const cx = Math.floor(MAP_W / 2), cy = Math.floor(MAP_H / 2);
  for (let dy = -4; dy <= 4; dy++)
    for (let dx = -4; dx <= 4; dx++)
      map[cy + dy][cx + dx] = T_GRASS;
  for (let i = 1; i <= 8; i++) { map[cy - 4 - i][cx] = T_PATH; map[cy + 4 + i][cx] = T_PATH; }
}

function isSolid(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  const t = map[ty][tx];
  return t === T_TREE || t === T_ROCK || t === T_WATER;
}

// ─── Tile cache ───────────────────────────────────────────────────────────────
const tileCache = {};

function buildTile(id) {
  const oc = document.createElement('canvas');
  oc.width = oc.height = TS;
  const c = oc.getContext('2d');
  switch (id) {
    case T_GRASS: {
      c.fillStyle = '#5c9e3a'; c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#4e8a30';
      [[4,6],[18,20],[10,2],[24,12],[2,26],[28,4],[14,28]].forEach(([x,y]) => c.fillRect(x, y, 2, 3));
      break;
    }
    case T_GRASS2: {
      c.fillStyle = '#4f9133'; c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#6aaa48';
      [[6,5],[20,18],[12,26]].forEach(([x,y]) => { c.fillRect(x, y, 2, 5); c.fillRect(x+3, y+2, 2, 4); });
      break;
    }
    case T_GRASS3: {
      c.fillStyle = '#548c36'; c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#3a7224';
      c.fillRect(8,10,4,4); c.fillRect(20,4,3,3); c.fillRect(16,22,3,3);
      break;
    }
    case T_FLOWER: {
      c.fillStyle = '#5c9e3a'; c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#3a7224'; c.fillRect(14,18,2,8);
      const pc = ['#ffdd44','#ff88cc','#ff6633','#99ddff'][Math.floor(rng()*4)];
      c.fillStyle = pc;
      c.fillRect(11,12,4,4); c.fillRect(15,12,4,4); c.fillRect(11,16,4,4); c.fillRect(15,16,4,4);
      c.fillStyle = '#ffff88'; c.fillRect(13,14,4,4);
      c.fillStyle = '#3a7224'; c.fillRect(6,22,2,6);
      c.fillStyle = '#ff88cc';
      c.fillRect(4,18,3,3); c.fillRect(7,18,3,3); c.fillRect(4,21,3,3); c.fillRect(7,21,3,3);
      c.fillStyle = '#ffff88'; c.fillRect(6,20,2,2);
      break;
    }
    case T_TREE: {
      c.fillStyle = '#3d7a28'; c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#7a4e2a'; c.fillRect(12,20,8,12);
      c.fillStyle = '#5a3818'; c.fillRect(14,22,4,8);
      c.fillStyle = '#1e5c10'; c.fillRect(4,10,24,14);
      c.fillStyle = '#2a7018'; c.fillRect(6,6,20,12);
      c.fillStyle = '#3a8a24'; c.fillRect(9,2,14,10);
      c.fillStyle = '#4a9e30'; c.fillRect(12,0,8,6);
      c.fillStyle = '#5ab040'; c.fillRect(10,4,4,4);
      break;
    }
    case T_ROCK: {
      c.fillStyle = '#5c9e3a'; c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#7a7a7a'; c.fillRect(6,14,20,12);
      c.fillStyle = '#9e9e9e'; c.fillRect(8,10,16,10);
      c.fillStyle = '#b8b8b8'; c.fillRect(10,8,10,7);
      c.fillStyle = '#d0d0d0'; c.fillRect(11,9,5,3);
      c.fillStyle = '#555555'; c.fillRect(9,22,14,4);
      break;
    }
    case T_WATER: {
      c.fillStyle = '#2c6eaa'; c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#3a82c4'; c.fillRect(0,4,TS,4); c.fillRect(0,16,TS,4);
      c.fillStyle = '#70b8e8';
      c.fillRect(4,6,8,2); c.fillRect(18,18,10,2); c.fillRect(2,20,6,2);
      break;
    }
    case T_SAND: {
      c.fillStyle = '#d4b06a'; c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#c09848';
      [[3,8],[16,4],[22,20],[8,24],[28,14]].forEach(([x,y]) => c.fillRect(x,y,2,2));
      c.fillStyle = '#e8cc80';
      [[10,14],[20,8]].forEach(([x,y]) => c.fillRect(x,y,3,3));
      break;
    }
    case T_PATH: {
      c.fillStyle = '#b89458'; c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#a07840';
      [[2,4],[14,18],[24,8],[6,26],[20,28]].forEach(([x,y]) => c.fillRect(x,y,4,2));
      c.fillStyle = '#ccaa70'; c.fillRect(2,2,2,2); c.fillRect(28,22,2,2);
      break;
    }
  }
  return oc;
}
function getTile(id) {
  if (!tileCache[id]) tileCache[id] = buildTile(id);
  return tileCache[id];
}

// ─── Player ───────────────────────────────────────────────────────────────────
const player = {
  x: (MAP_W / 2) * TS,
  y: (MAP_H / 2) * TS,
  w: 20, h: 28,
  dir: 'down',
  moving: false,
  animFrame: 0,
  animTimer: 0,
  attacking: false,
  attackTimer: 0,
  attackCooldown: 0,
  attackHit: new Set(),
};

// ─── Camera ───────────────────────────────────────────────────────────────────
const cam = { x: 0, y: 0 };
function updateCamera() {
  cam.x = player.x + player.w / 2 - canvas.width  / 2;
  cam.y = player.y + player.h / 2 - canvas.height / 2;
  cam.x = Math.max(0, Math.min(cam.x, MAP_W * TS - canvas.width));
  cam.y = Math.max(0, Math.min(cam.y, MAP_H * TS - canvas.height));
}

// ─── Input ────────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  if ((e.key === 'z' || e.key === 'Z' || e.key === ' ') && !e.repeat) {
    e.preventDefault();
    tryAttack();
  }
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

function tryAttack() {
  if (!player.attacking && player.attackCooldown <= 0) {
    player.attacking   = true;
    player.attackTimer = 0;
    player.attackHit   = new Set();
  }
}

// ─── Goblins ─────────────────────────────────────────────────────────────────
const goblins = [];
let killCount = 0;

function spawnGoblins() {
  const cx = Math.floor(MAP_W / 2), cy = Math.floor(MAP_H / 2);
  const gr = seededRand(99);
  for (let i = 0; i < GOBLIN_COUNT; i++) {
    let tx, ty, attempts = 0;
    do {
      tx = 2 + Math.floor(gr() * (MAP_W - 4));
      ty = 2 + Math.floor(gr() * (MAP_H - 4));
      attempts++;
    } while (
      (isSolid(tx, ty) || (Math.abs(tx - cx) < 10 && Math.abs(ty - cy) < 10)) &&
      attempts < 200
    );
    goblins.push({
      x: tx * TS + TS / 2,
      y: ty * TS + TS / 2,
      dir: 'down',
      alive: true,
      dying: false,
      deathTimer: 0,
      animFrame: 0,
      animTimer: 0,
      hitFlash: 0,
      wanderAngle: gr() * Math.PI * 2,
      wanderTimer: 0,
    });
  }
}

function updateGoblins(dt) {
  for (const g of goblins) {
    if (g.dying) {
      g.deathTimer -= dt;
      return;
    }
    if (!g.alive) continue;

    // Update flash
    if (g.hitFlash > 0) g.hitFlash -= dt;

    // AI: chase player if in range, else wander
    const dx = player.x - g.x, dy = player.y - g.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let mx = 0, my = 0;
    if (dist < DETECT_RANGE && dist > 4) {
      mx = (dx / dist) * GOBLIN_SPEED;
      my = (dy / dist) * GOBLIN_SPEED;
    } else {
      // Slow random wander
      g.wanderTimer -= dt;
      if (g.wanderTimer <= 0) {
        g.wanderAngle += (Math.random() - 0.5) * Math.PI;
        g.wanderTimer = 1200 + Math.random() * 1600;
      }
      mx = Math.cos(g.wanderAngle) * GOBLIN_SPEED * 0.35;
      my = Math.sin(g.wanderAngle) * GOBLIN_SPEED * 0.35;
    }

    // Facing direction
    if (Math.abs(mx) > Math.abs(my)) {
      g.dir = mx > 0 ? 'right' : 'left';
    } else if (my !== 0) {
      g.dir = my > 0 ? 'down' : 'up';
    }

    // Move with collision
    const mg = 4;
    const nx = g.x + mx, ny = g.y + my;
    const canX = !isSolid(Math.floor((nx + mg) / TS), Math.floor(g.y / TS)) &&
                 !isSolid(Math.floor((nx - mg) / TS), Math.floor(g.y / TS));
    const canY = !isSolid(Math.floor(g.x / TS), Math.floor((ny + mg) / TS)) &&
                 !isSolid(Math.floor(g.x / TS), Math.floor((ny - mg) / TS));

    if (canX) g.x = nx;
    if (canY) g.y = ny;

    // Walk animation
    if (mx !== 0 || my !== 0) {
      g.animTimer += dt;
      if (g.animTimer >= 200) {
        g.animTimer = 0;
        g.animFrame = (g.animFrame + 1) % 4;
      }
    }
  }
}

// ─── Particles ────────────────────────────────────────────────────────────────
const particles = [];

function spawnDeathParticles(x, y) {
  const colors = ['#cc2222','#aa1111','#ff5544','#882200','#ff8833'];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.6;
    const speed = 1.2 + Math.random() * 2.5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1.0,
      decay: 0.025 + Math.random() * 0.025,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x   += p.vx;
    p.y   += p.vy;
    p.vy  += 0.08; // gravity
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ─── Kill goblin ──────────────────────────────────────────────────────────────
function killGoblin(g) {
  g.alive     = false;
  g.dying     = true;
  g.deathTimer = DEATH_DUR;
  g.hitFlash  = 80;
  killCount++;
  spawnDeathParticles(g.x, g.y);
}

// ─── Attack hitbox ────────────────────────────────────────────────────────────
function getAttackRect() {
  const range = 42;
  switch (player.dir) {
    case 'right': return { x: player.x + player.w,        y: player.y - 6,          w: range, h: player.h + 12 };
    case 'left':  return { x: player.x - range,           y: player.y - 6,          w: range, h: player.h + 12 };
    case 'up':    return { x: player.x - 6,               y: player.y - range,      w: player.w + 12, h: range };
    case 'down':  return { x: player.x - 6,               y: player.y + player.h,   w: player.w + 12, h: range };
  }
}

function checkAttackHits() {
  const progress = player.attackTimer / ATTACK_DURATION;
  if (progress < 0.1 || progress > 0.7) return;
  const ar = getAttackRect();
  for (const g of goblins) {
    if (!g.alive || g.dying || player.attackHit.has(g)) continue;
    if (g.x + 9 > ar.x && g.x - 9 < ar.x + ar.w &&
        g.y + 9 > ar.y && g.y - 9 < ar.y + ar.h) {
      g.hitFlash = 120;
      killGoblin(g);
      player.attackHit.add(g);
    }
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────
function update(dt) {
  // Attack state machine
  if (player.attacking) {
    player.attackTimer += dt;
    checkAttackHits();
    if (player.attackTimer >= ATTACK_DURATION) {
      player.attacking     = false;
      player.attackTimer   = 0;
      player.attackCooldown = ATTACK_COOLDOWN;
    }
  }
  if (player.attackCooldown > 0) player.attackCooldown = Math.max(0, player.attackCooldown - dt);

  // Movement
  let dx = 0, dy = 0;
  if (keys['ArrowLeft']  || keys['a']) { dx = -1; player.dir = 'left';  }
  if (keys['ArrowRight'] || keys['d']) { dx =  1; player.dir = 'right'; }
  if (keys['ArrowUp']    || keys['w']) { dy = -1; player.dir = 'up';    }
  if (keys['ArrowDown']  || keys['s']) { dy =  1; player.dir = 'down';  }

  const spd = player.attacking ? SPEED * 0.35 : SPEED;
  player.moving = dx !== 0 || dy !== 0;

  if (player.moving) {
    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }
    const nx = player.x + dx * spd;
    const ny = player.y + dy * spd;
    const mg = 3;
    const canX = canMove(nx, player.y, mg);
    const canY = canMove(player.x, ny, mg);
    if (canX && canY) { player.x = nx; player.y = ny; }
    else if (canX)    { player.x = nx; }
    else if (canY)    { player.y = ny; }

    player.animTimer += dt;
    if (player.animTimer >= ANIM_RATE) {
      player.animTimer -= ANIM_RATE;
      player.animFrame = (player.animFrame + 1) % 4;
    }
  } else {
    player.animFrame = 0;
    player.animTimer = 0;
  }

  updateGoblins(dt);
  updateParticles(dt);
}

function canMove(px, py, mg) {
  const tx1 = Math.floor((px + mg)            / TS);
  const tx2 = Math.floor((px + player.w - mg) / TS);
  const ty1 = Math.floor((py + mg)            / TS);
  const ty2 = Math.floor((py + player.h - 2)  / TS);
  return !isSolid(tx1, ty1) && !isSolid(tx2, ty1) && !isSolid(tx1, ty2) && !isSolid(tx2, ty2);
}

// ─── Goblin sprite ────────────────────────────────────────────────────────────
function drawGoblin(ox, oy, dir, frame, alpha, flash) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(ox), Math.round(oy));

  const bob    = (frame % 2 === 1) ? 1 : 0;
  const isFlash = flash > 0;

  const px = (x, y, w, h, color) => {
    ctx.fillStyle = isFlash ? '#ffffff' : color;
    ctx.fillRect(x, y + bob, w, h);
  };

  // Shadow
  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.2})`;
  ctx.beginPath();
  ctx.ellipse(9, 24, 7, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (dir === 'down') {
    // Legs
    const ls = frame % 4 >= 2;
    px(4,  16, 4, ls ? 8 : 6,  '#7a1a00');
    px(10, 16, 4, ls ? 6 : 8,  '#7a1a00');
    px(3,  22, 5, 3, '#4a0e00');
    px(9,  22, 5, 3, '#4a0e00');
    // Body
    px(3,  10, 12, 8,  '#aa2800');
    px(4,  11, 10, 6,  '#cc3300');
    px(5,  12, 8,  4,  '#dd4422');
    // Arms
    const aw = frame % 4 >= 2;
    px(0,  10, 4, aw ? 7 : 5, '#aa2800');
    px(14, 10, 4, aw ? 5 : 7, '#aa2800');
    px(0,  15, 3, 3, '#881c00');
    px(15, 15, 3, 3, '#881c00');
    // Head
    px(3,  2,  12, 9, '#cc3300');
    px(4,  1,  10, 3, '#aa2800');
    px(5,  3,  8,  6, '#ee4422');
    // Horns
    px(3,  0,  3,  4, '#881c00');
    px(12, 0,  3,  4, '#881c00');
    px(4,  -1, 2,  2, '#aa2800');
    px(13, -1, 2,  2, '#aa2800');
    // Eyes
    px(5,  4,  3,  3, '#ffee00');
    px(10, 4,  3,  3, '#ffee00');
    px(6,  5,  2,  2, '#000000');
    px(11, 5,  2,  2, '#000000');
    // Mouth/teeth
    px(6,  9,  6,  2, '#220000');
    px(7,  8,  2,  2, '#ffffff');
    px(10, 8,  2,  2, '#ffffff');

  } else if (dir === 'up') {
    const ls = frame % 4 >= 2;
    px(4,  16, 4, ls ? 8 : 6,  '#7a1a00');
    px(10, 16, 4, ls ? 6 : 8,  '#7a1a00');
    px(3,  22, 5, 3, '#4a0e00');
    px(9,  22, 5, 3, '#4a0e00');
    px(3,  10, 12, 8,  '#992400');
    px(4,  11, 10, 6,  '#bb3000');
    px(0,  10, 4, 6, '#992400');
    px(14, 10, 4, 6, '#992400');
    // Head (back)
    px(3,  2,  12, 9, '#aa2800');
    px(4,  1,  10, 3, '#992400');
    // Back horns
    px(3,  0,  3,  4, '#771800');
    px(12, 0,  3,  4, '#771800');

  } else if (dir === 'left') {
    const ls = frame % 4 >= 2;
    px(5,  16, 5, ls ? 8 : 6, '#7a1a00');
    px(9,  16, 4, ls ? 6 : 8, '#7a1a00');
    px(4,  22, 6, 3, '#4a0e00');
    // Body
    px(4,  10, 10, 8, '#aa2800');
    px(5,  11, 8,  6, '#cc3300');
    // Arms (only far one visible + near stub)
    px(12, 11, 4, 5, '#992400');
    px(2,  12, 3, 4, '#aa2800');
    // Head (side view)
    px(4,  2,  10, 9, '#cc3300');
    px(5,  1,  8,  3, '#aa2800');
    px(3,  3,  10, 6, '#ee4422');
    // Horn (left)
    px(2,  0,  3,  4, '#881c00');
    px(2,  -1, 2,  2, '#aa2800');
    // Eye
    px(4,  5,  3,  3, '#ffee00');
    px(5,  6,  2,  2, '#000000');
    // Mouth
    px(5,  9,  5,  2, '#220000');
    px(6,  8,  2,  2, '#ffffff');

  } else { // right
    const ls = frame % 4 >= 2;
    px(8,  16, 5, ls ? 8 : 6, '#7a1a00');
    px(12, 16, 4, ls ? 6 : 8, '#7a1a00');
    px(9,  22, 6, 3, '#4a0e00');
    px(4,  10, 10, 8, '#aa2800');
    px(5,  11, 8,  6, '#cc3300');
    px(2,  11, 4,  5, '#992400');
    px(13, 12, 3,  4, '#aa2800');
    px(4,  2,  10, 9, '#cc3300');
    px(5,  1,  8,  3, '#aa2800');
    px(5,  3,  8,  6, '#ee4422');
    // Horn (right)
    px(13, 0,  3,  4, '#881c00');
    px(14, -1, 2,  2, '#aa2800');
    // Eye
    px(11, 5,  3,  3, '#ffee00');
    px(12, 6,  2,  2, '#000000');
    px(9,  9,  5,  2, '#220000');
    px(11, 8,  2,  2, '#ffffff');
  }

  ctx.restore();
}

// ─── Knight sprite ────────────────────────────────────────────────────────────
function drawKnight(ox, oy, dir, frame, moving, attacking, attackProgress) {
  ctx.save();
  ctx.translate(Math.round(ox), Math.round(oy));

  const bob = (moving && frame % 2 === 1) ? 1 : 0;
  const px = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y + bob, w, h);
  };

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(12, 34, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sword swing angle: progress 0→0.5 = wind-up (pull back), 0.5→1 = slash (swing fwd)
  // The sword extends outward at peak of swing (progress ~0.5)
  const swingT    = attacking ? Math.sin(attackProgress * Math.PI) : 0; // 0→1→0
  const swingOut  = swingT;  // 0 at rest, 1 at full extension, 0 at return

  if (dir === 'down') {
    const legSwap = moving && frame % 4 >= 2;
    px(7,  22, 5, legSwap ? 10 : 8,  '#334499');
    px(13, 22, 5, legSwap ? 8  : 10, '#334499');
    px(6,  30, 7, 4, '#2a1e14'); px(12, 30, 7, 4, '#2a1e14');
    px(6,  33, 7, 2, '#1a0e06'); px(12, 33, 7, 2, '#1a0e06');
    px(5,  14, 15, 10, '#6677bb'); px(7,  15, 11, 8, '#8899dd'); px(9,  16, 7,  6, '#aabcee');
    px(5,  23, 15, 2,  '#5a3a14'); px(9,  23, 4,  2, '#cc9933');
    // shield
    px(0,  14, 6, 10, '#bb2222'); px(1,  15, 4, 8, '#dd3333'); px(1,  17, 4, 4, '#ffcc22'); px(2, 18, 2, 2, '#ffffff');
    // sword arm — swings forward (down) during attack
    const swordOffY = Math.round(swingOut * 10);
    const swordOffX = Math.round(swingOut * 4);
    px(20, 14, 5, 8, '#6677bb');
    px(22 + swordOffX, 2 - 8 + swordOffY, 3, 14, '#cccccc');
    px(22 + swordOffX, 1 - 8 + swordOffY, 3, 3,  '#e8e8e8');
    px(19 + swordOffX, 13 - 8 + swordOffY + 8, 9, 2, '#aa7722');
    // slash arc
    if (attacking && swingT > 0.1) {
      ctx.save();
      ctx.globalAlpha = swingT * 0.6;
      ctx.strokeStyle = '#ffffa0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(22, 18, 16 + swingOut * 6, -Math.PI * 0.5, Math.PI * 0.4);
      ctx.stroke();
      ctx.globalAlpha = swingT * 0.3;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();
    }
    // head
    px(9,  10, 8,  5, '#e8c888');
    px(7,  5,  12, 9, '#8899aa'); px(8,  4,  10, 3, '#aabbcc'); px(9,  2,  8,  4, '#c0d4e0');
    px(8,  8,  10, 3, '#1e2233'); px(9,  8,  4,  2, '#334466'); px(13, 8,  4,  2, '#334466');
    px(10, 8,  2,  2, '#ffdd44'); px(14, 8,  2,  2, '#ffdd44');
    px(11, 0,  4,  4, '#cc2222'); px(12, -2, 2,  4, '#ff4444');

  } else if (dir === 'up') {
    const legSwap = moving && frame % 4 >= 2;
    px(7,  22, 5, legSwap ? 10 : 8,  '#334499');
    px(13, 22, 5, legSwap ? 8  : 10, '#334499');
    px(6,  30, 7, 4, '#2a1e14'); px(12, 30, 7, 4, '#2a1e14');
    px(5,  14, 15, 10, '#5566aa'); px(7,  15, 11, 8, '#7788bb'); px(9, 16, 7, 5, '#8899cc');
    px(5,  23, 15, 2, '#5a3a14');
    // sword over shoulder — rises up during attack
    const swordOffY2 = Math.round(-swingOut * 10);
    px(20, 14, 5, 8, '#5566aa');
    px(22, 1 + swordOffY2, 3, 14, '#cccccc');
    px(19, 13 + swordOffY2, 9, 2, '#aa7722');
    if (attacking && swingT > 0.1) {
      ctx.save();
      ctx.globalAlpha = swingT * 0.6;
      ctx.strokeStyle = '#ffffa0'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(22, 10, 14 + swingOut * 6, -Math.PI * 1.2, -Math.PI * 0.1);
      ctx.stroke();
      ctx.globalAlpha = swingT * 0.3;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.stroke();
      ctx.restore();
    }
    px(0,  13, 6, 10, '#991111'); px(1, 14, 4, 8, '#bb2222'); px(1, 16, 4, 4, '#cc8811');
    px(7,  5, 12, 11, '#8899aa'); px(8,  4, 10, 4, '#aabbcc'); px(9,  2, 8, 4, '#c0d4e0');
    px(9,  8, 8,  4, '#6677aa');
    px(11, 0, 4,  4, '#cc2222'); px(12, -2, 2, 4, '#ff4444');

  } else if (dir === 'left') {
    const legSwap = moving && frame % 4 >= 2;
    px(8,  22, 6, legSwap ? 10 : 8,  '#334499');
    px(12, 22, 5, legSwap ? 8  : 10, '#334499');
    px(6,  30, 8, 4, '#2a1e14');
    px(6,  14, 13, 10, '#6677bb'); px(7, 15, 10, 8, '#8899dd'); px(8, 16, 8, 6, '#9aabee');
    px(6,  23, 13, 2, '#5a3a14');
    // shield (front)
    px(0,  11, 7, 12, '#bb2222'); px(1, 12, 5, 10, '#dd3333'); px(1, 14, 5, 6, '#ffcc22'); px(2, 16, 3, 2, '#ffffff');
    px(5,  14, 5, 9, '#5566aa');
    // sword — swings left (outward) during attack
    const sOffX = Math.round(-swingOut * 10);
    const sOffY3 = Math.round(swingOut * 4);
    px(18, 14, 5, 9, '#5566aa');
    px(18 + sOffX, 2 + sOffY3, 3, 14, '#cccccc');
    px(16 + sOffX, 13 + sOffY3, 7, 2, '#aa7722');
    if (attacking && swingT > 0.1) {
      ctx.save();
      ctx.globalAlpha = swingT * 0.6;
      ctx.strokeStyle = '#ffffa0'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(6, 14, 18 + swingOut * 6, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
      ctx.globalAlpha = swingT * 0.3;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.stroke();
      ctx.restore();
    }
    px(7,  9,  9, 5, '#e8c888');
    px(6,  4, 11, 10, '#8899aa'); px(7,  3, 9, 4, '#aabbcc'); px(8,  1, 8, 4, '#c0d4e0');
    px(6,  8, 5,  3, '#1e2233'); px(7,  9, 2, 2, '#ffdd44');
    px(10, 0, 4,  3, '#cc2222'); px(11, -2, 2, 4, '#ff4444');

  } else { // right
    const legSwap = moving && frame % 4 >= 2;
    px(10, 22, 6, legSwap ? 10 : 8,  '#334499');
    px(12, 22, 5, legSwap ? 8  : 10, '#334499');
    px(10, 30, 8, 4, '#2a1e14');
    px(6,  14, 13, 10, '#6677bb'); px(7,  15, 10, 8, '#8899dd'); px(9, 16, 8, 6, '#9aabee');
    px(6,  23, 13, 2, '#5a3a14');
    px(2,  13, 5, 9, '#991111'); px(2, 14, 4, 8, '#bb2222');
    px(3,  14, 5, 9, '#5566aa');
    // sword — swings right (outward) during attack
    const sOffX2 = Math.round(swingOut * 10);
    const sOffY4 = Math.round(swingOut * 4);
    px(18, 14, 5, 9, '#5566aa');
    px(19 + sOffX2, 2 + sOffY4, 3, 14, '#cccccc');
    px(17 + sOffX2, 13 + sOffY4, 7, 2, '#aa7722');
    if (attacking && swingT > 0.1) {
      ctx.save();
      ctx.globalAlpha = swingT * 0.6;
      ctx.strokeStyle = '#ffffa0'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(18, 14, 18 + swingOut * 6, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
      ctx.globalAlpha = swingT * 0.3;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.stroke();
      ctx.restore();
    }
    px(10, 9, 9, 5, '#e8c888');
    px(9,  4, 11, 10, '#8899aa'); px(9,  3, 9, 4, '#aabbcc'); px(10, 1, 8, 4, '#c0d4e0');
    px(15, 8, 5, 3, '#1e2233'); px(17, 9, 2, 2, '#ffdd44');
    px(10, 0, 4, 3, '#cc2222'); px(11, -2, 2, 4, '#ff4444');
  }

  ctx.restore();
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  ctx.fillStyle = '#1a3a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startX = Math.max(0, Math.floor(cam.x / TS));
  const startY = Math.max(0, Math.floor(cam.y / TS));
  const endX   = Math.min(MAP_W, Math.ceil((cam.x + canvas.width)  / TS));
  const endY   = Math.min(MAP_H, Math.ceil((cam.y + canvas.height) / TS));

  for (let ty = startY; ty < endY; ty++)
    for (let tx = startX; tx < endX; tx++)
      ctx.drawImage(getTile(map[ty][tx]), tx * TS - cam.x, ty * TS - cam.y);

  // Collect all entities for Y-sorted rendering
  const entities = [];

  // Goblins
  for (const g of goblins) {
    if (g.dying) {
      const t = g.deathTimer / DEATH_DUR;
      entities.push({ y: g.y, type: 'goblin', g, alpha: t, flash: g.hitFlash });
    } else if (g.alive) {
      entities.push({ y: g.y, type: 'goblin', g, alpha: 1, flash: g.hitFlash });
    }
  }

  // Player
  entities.push({ y: player.y + player.h, type: 'player' });

  // Sort by y for depth
  entities.sort((a, b) => a.y - b.y);

  for (const e of entities) {
    if (e.type === 'goblin') {
      const sx = e.g.x - cam.x - 9;
      const sy = e.g.y - cam.y - 14;
      drawGoblin(sx, sy, e.g.dir, e.g.animFrame, e.alpha, e.flash);
    } else {
      const sx = player.x - cam.x - 2;
      const sy = player.y - cam.y - 6;
      drawKnight(sx, sy, player.dir, player.animFrame, player.moving,
        player.attacking, player.attacking ? player.attackTimer / ATTACK_DURATION : 0);
    }
  }

  // Particles
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - cam.x - p.size / 2, p.y - cam.y - p.size / 2, p.size, p.size);
    ctx.restore();
  }

  drawHUD();
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawHUD() {
  // Controls panel
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 10, canvas.height - 52, 240, 42, 6);
  ctx.fill();
  ctx.fillStyle = '#e8d5a3';
  ctx.font = '12px "Courier New"';
  ctx.fillText('Move: Arrow Keys / WASD', 20, canvas.height - 32);
  ctx.fillText('Attack: Z or Space', 20, canvas.height - 14);

  // Kill counter
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, canvas.width / 2 - 80, 10, 160, 34, 6);
  ctx.fill();
  ctx.fillStyle = '#ff6644';
  ctx.font = 'bold 14px "Courier New"';
  ctx.textAlign = 'center';
  ctx.fillText(`☠ Goblins: ${killCount}`, canvas.width / 2, 32);
  ctx.textAlign = 'left';

  // Attack cooldown bar
  if (player.attackCooldown > 0) {
    const pct = 1 - player.attackCooldown / ATTACK_COOLDOWN;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, 10, canvas.height - 60, 80, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(10, canvas.height - 60, 80 * pct, 6);
  }

  // Mini-map
  const mmW = 100, mmH = 100;
  const mmX = canvas.width - mmW - 10;
  const mmY = 10;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, mmX - 2, mmY - 2, mmW + 4, mmH + 4, 4);
  ctx.fill();
  const scaleX = mmW / MAP_W, scaleY = mmH / MAP_H;
  for (let ty = 0; ty < MAP_H; ty++)
    for (let tx = 0; tx < MAP_W; tx++) {
      ctx.fillStyle = minimapColor(map[ty][tx]);
      ctx.fillRect(mmX + tx * scaleX, mmY + ty * scaleY, Math.max(1, scaleX), Math.max(1, scaleY));
    }
  // Goblin dots on minimap
  for (const g of goblins) {
    if (!g.alive && !g.dying) continue;
    ctx.fillStyle = g.dying ? 'rgba(200,50,50,0.5)' : '#ff4422';
    ctx.fillRect(mmX + (g.x / TS) * scaleX - 1, mmY + (g.y / TS) * scaleY - 1, 2.5, 2.5);
  }
  ctx.strokeStyle = 'rgba(255,255,200,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    mmX + (cam.x / TS) * scaleX,
    mmY + (cam.y / TS) * scaleY,
    (canvas.width  / TS) * scaleX,
    (canvas.height / TS) * scaleY
  );
  ctx.fillStyle = '#ffdd44';
  ctx.fillRect(mmX + (player.x / TS) * scaleX - 1.5, mmY + (player.y / TS) * scaleY - 1.5, 3, 3);
}

function minimapColor(tile) {
  switch (tile) {
    case T_GRASS:  return '#4a8a30'; case T_GRASS2: return '#3e7a24';
    case T_GRASS3: return '#507830'; case T_FLOWER: return '#88cc44';
    case T_TREE:   return '#1e4a10'; case T_ROCK:   return '#888888';
    case T_WATER:  return '#3366aa'; case T_SAND:   return '#c8a850';
    case T_PATH:   return '#9a7840'; default:        return '#000000';
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Game loop ────────────────────────────────────────────────────────────────
let lastTime = 0;
function loop(ts) {
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;
  update(dt);
  updateCamera();
  render();
  requestAnimationFrame(loop);
}

generateMap();
spawnGoblins();
requestAnimationFrame(loop);
