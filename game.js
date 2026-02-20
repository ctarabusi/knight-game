// ─── Canvas setup ────────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

canvas.width  = 800;
canvas.height = 560;

// ─── Constants ───────────────────────────────────────────────────────────────
const TS         = 32;   // tile size in pixels
const MAP_W      = 60;
const MAP_H      = 60;
const SPEED      = 1.8;
const ANIM_RATE  = 140;  // ms per animation frame

// Tile IDs
const T_GRASS   = 0;
const T_GRASS2  = 1;
const T_GRASS3  = 2;
const T_FLOWER  = 3;
const T_TREE    = 4;
const T_ROCK    = 5;
const T_WATER   = 6;
const T_SAND    = 7;
const T_PATH    = 8;

// ─── Map generation ──────────────────────────────────────────────────────────
const map = [];

// Simple seeded pseudo-random for reproducibility
function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
const rng = seededRand(42);

function generateMap() {
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const border = x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1;
      if (border) { map[y][x] = T_TREE; continue; }

      const r = rng();
      if (r < 0.55)      map[y][x] = T_GRASS;
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

  // Carve a clear starting area around the player spawn
  const cx = Math.floor(MAP_W / 2);
  const cy = Math.floor(MAP_H / 2);
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      map[cy + dy][cx + dx] = T_GRASS;
    }
  }

  // Add a little dirt path leading north from spawn
  for (let i = 1; i <= 8; i++) map[cy - 4 - i][cx] = T_PATH;
  for (let i = 1; i <= 8; i++) map[cy + 4 + i][cx] = T_PATH;
}

function isSolid(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  const t = map[ty][tx];
  return t === T_TREE || t === T_ROCK || t === T_WATER;
}

// ─── Pixel-art tile renderer ──────────────────────────────────────────────────
// Pre-build tile images onto offscreen canvases for performance
const tileCache = {};

function buildTile(id) {
  const oc = document.createElement('canvas');
  oc.width = oc.height = TS;
  const c = oc.getContext('2d');

  switch (id) {
    case T_GRASS: {
      c.fillStyle = '#5c9e3a';
      c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#4e8a30';
      [[4,6],[18,20],[10,2],[24,12],[2,26],[28,4],[14,28]] .forEach(([x,y]) => c.fillRect(x, y, 2, 3));
      break;
    }
    case T_GRASS2: {
      c.fillStyle = '#4f9133';
      c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#6aaa48';
      [[6,5],[20,18],[12,26]] .forEach(([x,y]) => { c.fillRect(x, y, 2, 5); c.fillRect(x+3, y+2, 2, 4); });
      break;
    }
    case T_GRASS3: {
      c.fillStyle = '#548c36';
      c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#3a7224';
      c.fillRect(8, 10, 4, 4);
      c.fillRect(20, 4, 3, 3);
      c.fillRect(16, 22, 3, 3);
      break;
    }
    case T_FLOWER: {
      c.fillStyle = '#5c9e3a';
      c.fillRect(0, 0, TS, TS);
      // stem
      c.fillStyle = '#3a7224';
      c.fillRect(14, 18, 2, 8);
      // petals
      const pColors = ['#ffdd44','#ff88cc','#ff6633','#99ddff'];
      const pc = pColors[Math.floor(rng() * pColors.length)];
      c.fillStyle = pc;
      c.fillRect(11, 12, 4, 4);
      c.fillRect(15, 12, 4, 4);
      c.fillRect(11, 16, 4, 4);
      c.fillRect(15, 16, 4, 4);
      c.fillStyle = '#ffff88';
      c.fillRect(13, 14, 4, 4);
      // second flower
      c.fillStyle = '#3a7224';
      c.fillRect(6, 22, 2, 6);
      c.fillStyle = '#ff88cc';
      c.fillRect(4, 18, 3, 3); c.fillRect(7, 18, 3, 3);
      c.fillRect(4, 21, 3, 3); c.fillRect(7, 21, 3, 3);
      c.fillStyle = '#ffff88'; c.fillRect(6, 20, 2, 2);
      break;
    }
    case T_TREE: {
      c.fillStyle = '#3d7a28';
      c.fillRect(0, 0, TS, TS);
      // trunk
      c.fillStyle = '#7a4e2a';
      c.fillRect(12, 20, 8, 12);
      c.fillStyle = '#5a3818';
      c.fillRect(14, 22, 4, 8);
      // canopy layers
      c.fillStyle = '#1e5c10';
      c.fillRect(4, 10, 24, 14);
      c.fillStyle = '#2a7018';
      c.fillRect(6, 6, 20, 12);
      c.fillStyle = '#3a8a24';
      c.fillRect(9, 2, 14, 10);
      c.fillStyle = '#4a9e30';
      c.fillRect(12, 0, 8, 6);
      // highlight
      c.fillStyle = '#5ab040';
      c.fillRect(10, 4, 4, 4);
      break;
    }
    case T_ROCK: {
      c.fillStyle = '#5c9e3a';
      c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#7a7a7a';
      c.fillRect(6, 14, 20, 12);
      c.fillStyle = '#9e9e9e';
      c.fillRect(8, 10, 16, 10);
      c.fillStyle = '#b8b8b8';
      c.fillRect(10, 8, 10, 7);
      c.fillStyle = '#d0d0d0';
      c.fillRect(11, 9, 5, 3);
      c.fillStyle = '#555555';
      c.fillRect(9, 22, 14, 4);
      break;
    }
    case T_WATER: {
      c.fillStyle = '#2c6eaa';
      c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#3a82c4';
      c.fillRect(0, 4, TS, 4);
      c.fillRect(0, 16, TS, 4);
      c.fillStyle = '#70b8e8';
      c.fillRect(4, 6, 8, 2);
      c.fillRect(18, 18, 10, 2);
      c.fillRect(2, 20, 6, 2);
      break;
    }
    case T_SAND: {
      c.fillStyle = '#d4b06a';
      c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#c09848';
      [[3,8],[16,4],[22,20],[8,24],[28,14]] .forEach(([x,y]) => c.fillRect(x, y, 2, 2));
      c.fillStyle = '#e8cc80';
      [[10,14],[20,8]] .forEach(([x,y]) => c.fillRect(x, y, 3, 3));
      break;
    }
    case T_PATH: {
      c.fillStyle = '#b89458';
      c.fillRect(0, 0, TS, TS);
      c.fillStyle = '#a07840';
      [[2,4],[14,18],[24,8],[6,26],[20,28]] .forEach(([x,y]) => c.fillRect(x, y, 4, 2));
      c.fillStyle = '#ccaa70';
      c.fillRect(2, 2, 2, 2);
      c.fillRect(28, 22, 2, 2);
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
  w: 20,
  h: 28,
  dir: 'down',
  moving: false,
  animFrame: 0,
  animTimer: 0,
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
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

// ─── Update ───────────────────────────────────────────────────────────────────
function update(dt) {
  let dx = 0, dy = 0;
  if (keys['ArrowLeft']  || keys['a']) { dx = -1; player.dir = 'left';  }
  if (keys['ArrowRight'] || keys['d']) { dx =  1; player.dir = 'right'; }
  if (keys['ArrowUp']    || keys['w']) { dy = -1; player.dir = 'up';    }
  if (keys['ArrowDown']  || keys['s']) { dy =  1; player.dir = 'down';  }

  // Prioritize last-pressed horizontal/vertical when both held
  player.moving = dx !== 0 || dy !== 0;

  if (player.moving) {
    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    const nx = player.x + dx * SPEED;
    const ny = player.y + dy * SPEED;
    const mg = 3; // collision margin

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
}

function canMove(px, py, mg) {
  const tx1 = Math.floor((px + mg)              / TS);
  const tx2 = Math.floor((px + player.w - mg)   / TS);
  const ty1 = Math.floor((py + mg)              / TS);
  const ty2 = Math.floor((py + player.h - 2)    / TS);
  return !isSolid(tx1, ty1) && !isSolid(tx2, ty1) && !isSolid(tx1, ty2) && !isSolid(tx2, ty2);
}

// ─── Knight sprite renderer ───────────────────────────────────────────────────
// Each direction is hand-authored pixel art using fillRect calls.
// Coordinate origin is top-left of the 24×34 sprite bounding box.
function drawKnight(ox, oy, dir, frame, moving) {
  ctx.save();
  ctx.translate(Math.round(ox), Math.round(oy));

  const bob = (moving && frame % 2 === 1) ? 1 : 0;

  // Helper
  const px = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y + bob, w, h);
  };

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(12, 34, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (dir === 'down') {
    // ── legs ──────────────────────────────────────────
    const legSwap = moving && frame % 4 >= 2;
    px(7,  22, 5, legSwap ? 10 : 8,  '#334499');
    px(13, 22, 5, legSwap ? 8  : 10, '#334499');
    // boots
    px(6,  30, 7, 4, '#2a1e14');
    px(12, 30, 7, 4, '#2a1e14');
    px(6,  33, 7, 2, '#1a0e06');
    px(12, 33, 7, 2, '#1a0e06');
    // ── body ──────────────────────────────────────────
    px(5,  14, 15, 10, '#6677bb');
    px(7,  15, 11, 8,  '#8899dd');
    px(9,  16, 7,  6,  '#aabcee');
    // belt
    px(5,  23, 15, 2, '#5a3a14');
    px(9,  23, 4,  2, '#cc9933');
    // ── shield (left arm) ─────────────────────────────
    px(0,  14, 6, 10, '#bb2222');
    px(1,  15, 4, 8,  '#dd3333');
    px(1,  17, 4, 4,  '#ffcc22');
    px(2,  18, 2, 2,  '#ffffff');
    // ── sword (right arm) ─────────────────────────────
    px(20, 14, 5, 8,  '#6677bb');  // arm
    px(22,  2, 3, 14, '#cccccc');  // blade
    px(22,  1, 3, 3,  '#e8e8e8');  // blade tip
    px(19, 13, 9, 2,  '#aa7722');  // guard
    px(23,  0, 2, 2,  '#dddddd');  // pommel-ish highlight
    // ── head / neck ───────────────────────────────────
    px(9,  10, 8, 5,  '#e8c888');  // neck/face
    // helmet body
    px(7,   5, 12, 9, '#8899aa');
    px(8,   4, 10, 3, '#aabbcc');
    px(9,   2, 8,  4, '#c0d4e0');
    // visor
    px(8,   8, 10, 3, '#1e2233');
    px(9,   8, 4,  2, '#334466'); // eye-slot shadow
    px(13,  8, 4,  2, '#334466');
    // eyes behind visor
    px(10,  8, 2, 2, '#ffdd44');
    px(14,  8, 2, 2, '#ffdd44');
    // plume
    px(11,  0, 4, 4, '#cc2222');
    px(12, -2, 2, 4, '#ff4444');

  } else if (dir === 'up') {
    const legSwap = moving && frame % 4 >= 2;
    px(7,  22, 5, legSwap ? 10 : 8,  '#334499');
    px(13, 22, 5, legSwap ? 8  : 10, '#334499');
    px(6,  30, 7, 4, '#2a1e14');
    px(12, 30, 7, 4, '#2a1e14');
    // body back
    px(5,  14, 15, 10, '#5566aa');
    px(7,  15, 11, 8,  '#7788bb');
    px(9,  16, 7,  5,  '#8899cc');
    px(5,  23, 15, 2,  '#5a3a14');
    // sword (visible over right shoulder)
    px(20, 14, 5, 8, '#5566aa');
    px(22,  1, 3, 14, '#cccccc');
    px(19, 13, 9, 2,  '#aa7722');
    // shield on back (visible left)
    px(0,  13, 6, 10, '#991111');
    px(1,  14, 4, 8,  '#bb2222');
    px(1,  16, 4, 4,  '#cc8811');
    // helmet (back view)
    px(7,   5, 12, 11, '#8899aa');
    px(8,   4, 10, 4,  '#aabbcc');
    px(9,   2, 8,  4,  '#c0d4e0');
    // back detail
    px(9,   8, 8,  4,  '#6677aa');
    // plume
    px(11,  0, 4, 4, '#cc2222');
    px(12, -2, 2, 4, '#ff4444');

  } else if (dir === 'left') {
    const legSwap = moving && frame % 4 >= 2;
    px(8,  22, 6, legSwap ? 10 : 8,  '#334499');
    px(12, 22, 5, legSwap ? 8  : 10, '#334499');
    px(6,  30, 8, 4, '#2a1e14');
    // body
    px(6,  14, 13, 10, '#6677bb');
    px(7,  15, 10, 8,  '#8899dd');
    px(8,  16, 8,  6,  '#9aabee');
    px(6,  23, 13, 2,  '#5a3a14');
    // shield (front, left side)
    px(0,  11, 7, 12, '#bb2222');
    px(1,  12, 5, 10, '#dd3333');
    px(1,  14, 5, 6,  '#ffcc22');
    px(2,  16, 3, 2,  '#ffffff');
    // arm holding shield
    px(5,  14, 5, 9, '#5566aa');
    // right arm / sword
    px(18, 14, 5, 9, '#5566aa');
    px(18,  2, 3, 14, '#cccccc');
    px(16, 13, 7, 2,  '#aa7722');
    // head
    px(7,   9, 9, 5, '#e8c888');
    // helmet side
    px(6,   4, 11, 10, '#8899aa');
    px(7,   3, 9,  4,  '#aabbcc');
    px(8,   1, 8,  4,  '#c0d4e0');
    // visor slit
    px(6,   8, 5, 3, '#1e2233');
    px(7,   9, 2, 2, '#ffdd44');
    // plume
    px(10,  0, 4, 3, '#cc2222');
    px(11, -2, 2, 4, '#ff4444');

  } else if (dir === 'right') {
    const legSwap = moving && frame % 4 >= 2;
    px(10, 22, 6, legSwap ? 10 : 8,  '#334499');
    px(12, 22, 5, legSwap ? 8  : 10, '#334499');
    px(10, 30, 8, 4, '#2a1e14');
    // body
    px(6,  14, 13, 10, '#6677bb');
    px(7,  15, 10, 8,  '#8899dd');
    px(9,  16, 8,  6,  '#9aabee');
    px(6,  23, 13, 2,  '#5a3a14');
    // shield (back, left side - partially hidden)
    px(2,  13, 5, 9, '#991111');
    px(2,  14, 4, 8, '#bb2222');
    // left arm
    px(3,  14, 5, 9, '#5566aa');
    // right arm / sword
    px(18, 14, 5, 9, '#5566aa');
    px(19,  2, 3, 14, '#cccccc');
    px(17, 13, 7, 2,  '#aa7722');
    // head
    px(10,  9, 9, 5, '#e8c888');
    // helmet
    px(9,   4, 11, 10, '#8899aa');
    px(9,   3, 9,  4,  '#aabbcc');
    px(10,  1, 8,  4,  '#c0d4e0');
    // visor
    px(15,  8, 5, 3, '#1e2233');
    px(17,  9, 2, 2, '#ffdd44');
    // plume
    px(10,  0, 4, 3, '#cc2222');
    px(11, -2, 2, 4, '#ff4444');
  }

  ctx.restore();
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  // Sky-ish fill for out-of-bounds edges
  ctx.fillStyle = '#1a3a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startX = Math.max(0, Math.floor(cam.x / TS));
  const startY = Math.max(0, Math.floor(cam.y / TS));
  const endX   = Math.min(MAP_W, Math.ceil((cam.x + canvas.width)  / TS));
  const endY   = Math.min(MAP_H, Math.ceil((cam.y + canvas.height) / TS));

  // Draw tiles
  for (let ty = startY; ty < endY; ty++) {
    for (let tx = startX; tx < endX; tx++) {
      const sx = tx * TS - cam.x;
      const sy = ty * TS - cam.y;
      ctx.drawImage(getTile(map[ty][tx]), sx, sy);
    }
  }

  // Draw player
  const px = player.x - cam.x;
  const py = player.y - cam.y;
  drawKnight(px - 2, py - 6, player.dir, player.animFrame, player.moving);

  // ── HUD ──────────────────────────────────────────────────────────────────
  // Controls hint (bottom-left)
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 10, canvas.height - 46, 218, 36, 6);
  ctx.fill();
  ctx.fillStyle = '#e8d5a3';
  ctx.font = '12px "Courier New"';
  ctx.fillText('Move: Arrow Keys  or  WASD', 20, canvas.height - 24);

  // Mini-map (top-right)
  const mmW = 100, mmH = 100;
  const mmX = canvas.width - mmW - 10;
  const mmY = 10;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, mmX - 2, mmY - 2, mmW + 4, mmH + 4, 4);
  ctx.fill();
  const scaleX = mmW / MAP_W;
  const scaleY = mmH / MAP_H;
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      ctx.fillStyle = minimapColor(map[ty][tx]);
      ctx.fillRect(mmX + tx * scaleX, mmY + ty * scaleY, Math.max(1, scaleX), Math.max(1, scaleY));
    }
  }
  // Viewport rect on minimap
  ctx.strokeStyle = 'rgba(255,255,200,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    mmX + (cam.x / TS) * scaleX,
    mmY + (cam.y / TS) * scaleY,
    (canvas.width  / TS) * scaleX,
    (canvas.height / TS) * scaleY
  );
  // Player dot
  ctx.fillStyle = '#ffdd44';
  ctx.fillRect(
    mmX + (player.x / TS) * scaleX - 1,
    mmY + (player.y / TS) * scaleY - 1,
    3, 3
  );
}

function minimapColor(tile) {
  switch (tile) {
    case T_GRASS:  return '#4a8a30';
    case T_GRASS2: return '#3e7a24';
    case T_GRASS3: return '#507830';
    case T_FLOWER: return '#88cc44';
    case T_TREE:   return '#1e4a10';
    case T_ROCK:   return '#888888';
    case T_WATER:  return '#3366aa';
    case T_SAND:   return '#c8a850';
    case T_PATH:   return '#9a7840';
    default:       return '#000000';
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
  const dt = Math.min(ts - lastTime, 50); // cap delta to avoid large jumps
  lastTime = ts;
  update(dt);
  updateCamera();
  render();
  requestAnimationFrame(loop);
}

generateMap();
requestAnimationFrame(loop);
