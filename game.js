// ─── Canvas setup ────────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

canvas.width  = 800;
canvas.height = 560;

// ─── Constants ───────────────────────────────────────────────────────────────
const TS               = 32;
const MAP_W            = 60;
const MAP_H            = 60;
const SPEED            = 1.8;
const ANIM_RATE        = 140;
const ATTACK_DURATION  = 280;
const ATTACK_COOLDOWN  = 300;
const GOBLIN_COUNT     = 18;
const GOBLIN_SPEED     = 0.55;
const TROLL_COUNT      = 3;
const TROLL_SPEED      = 0.3;
const TROLL_HP         = 3;
const DETECT_RANGE     = 340;
const DEATH_DUR        = 1000;
const GOBLIN_ATK_CD    = 1600;
const TROLL_ATK_CD     = 2400;
const PLAYER_INVINCIBLE = 1400;
const COIN_PICKUP_DIST  = 20;
const CAMPFIRE_HEAL_TIME = 2600;   // ms standing near fire to gain 1 heart
const CAMPFIRE_COOLDOWN  = 16000;  // ms before campfire can heal again
const CAMPFIRE_RANGE     = 38;
const HOUSE_ROOF_OVERHANG = 14;    // px the roof extends above the tile area
const SHOP_INTERACT_DIST  = 40;   // px from shop door to trigger interaction
const ARROW_SPEED         = 3.8;
const ARROW_MAX_DIST      = 300;

// Village bounds (in tiles)
const VX = 4, VY = 4, VW = 15, VH = 15;

// Cave / Dragon
const CAVE_W         = 25;
const CAVE_H         = 17;
const C_FLOOR        = 0;
const C_WALL         = 1;
const C_LAVA         = 2;
const CAVE_ENT_TX    = 30;   // cave entrance tile x on world map
const CAVE_ENT_TY    = 38;   // cave entrance tile y on world map
const DRAGON_HP_MAX  = 5;
const DRAGON_SPEED   = 0.65;
const DRAGON_DETECT  = 400;
const FIREBALL_SPEED = 2.6;
const FIREBALL_CD    = 2600;

// Cave map layout  (0=floor  1=wall  2=lava)
const CAVE_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,1],
  [1,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,1],
  [1,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,0,0,1],
  [1,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,0,0,1],
  [1,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,1],
  [1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,1],
  [1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Tile IDs
const T_GRASS  = 0, T_GRASS2 = 1, T_GRASS3 = 2, T_FLOWER = 3;
const T_TREE   = 4, T_ROCK   = 5, T_WATER  = 6, T_SAND   = 7, T_PATH = 8;
const T_WALL   = 9;  // invisible solid tile used for house footprints

// ─── Game state ───────────────────────────────────────────────────────────────
let gameState = 'playing';

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
  return t === T_TREE || t === T_ROCK || t === T_WATER || t === T_WALL;
}

// ─── Tile cache ───────────────────────────────────────────────────────────────
const tileCache = {};
function buildTile(id) {
  const oc = document.createElement('canvas');
  oc.width = oc.height = TS;
  const c = oc.getContext('2d');
  switch (id) {
    case T_GRASS: {
      c.fillStyle = '#5c9e3a'; c.fillRect(0,0,TS,TS);
      c.fillStyle = '#4e8a30';
      [[4,6],[18,20],[10,2],[24,12],[2,26],[28,4],[14,28]].forEach(([x,y])=>c.fillRect(x,y,2,3));
      break;
    }
    case T_GRASS2: {
      c.fillStyle = '#4f9133'; c.fillRect(0,0,TS,TS);
      c.fillStyle = '#6aaa48';
      [[6,5],[20,18],[12,26]].forEach(([x,y])=>{c.fillRect(x,y,2,5);c.fillRect(x+3,y+2,2,4);});
      break;
    }
    case T_GRASS3: {
      c.fillStyle = '#548c36'; c.fillRect(0,0,TS,TS);
      c.fillStyle='#3a7224'; c.fillRect(8,10,4,4); c.fillRect(20,4,3,3); c.fillRect(16,22,3,3);
      break;
    }
    case T_FLOWER: {
      c.fillStyle = '#5c9e3a'; c.fillRect(0,0,TS,TS);
      c.fillStyle = '#3a7224'; c.fillRect(14,18,2,8);
      const pc = ['#ffdd44','#ff88cc','#ff6633','#99ddff'][Math.floor(rng()*4)];
      c.fillStyle=pc;
      c.fillRect(11,12,4,4);c.fillRect(15,12,4,4);c.fillRect(11,16,4,4);c.fillRect(15,16,4,4);
      c.fillStyle='#ffff88'; c.fillRect(13,14,4,4);
      c.fillStyle='#3a7224'; c.fillRect(6,22,2,6);
      c.fillStyle='#ff88cc';
      c.fillRect(4,18,3,3);c.fillRect(7,18,3,3);c.fillRect(4,21,3,3);c.fillRect(7,21,3,3);
      c.fillStyle='#ffff88'; c.fillRect(6,20,2,2);
      break;
    }
    case T_TREE: {
      c.fillStyle='#3d7a28'; c.fillRect(0,0,TS,TS);
      c.fillStyle='#7a4e2a'; c.fillRect(12,20,8,12);
      c.fillStyle='#5a3818'; c.fillRect(14,22,4,8);
      c.fillStyle='#1e5c10'; c.fillRect(4,10,24,14);
      c.fillStyle='#2a7018'; c.fillRect(6,6,20,12);
      c.fillStyle='#3a8a24'; c.fillRect(9,2,14,10);
      c.fillStyle='#4a9e30'; c.fillRect(12,0,8,6);
      c.fillStyle='#5ab040'; c.fillRect(10,4,4,4);
      break;
    }
    case T_ROCK: {
      c.fillStyle='#5c9e3a'; c.fillRect(0,0,TS,TS);
      c.fillStyle='#7a7a7a'; c.fillRect(6,14,20,12);
      c.fillStyle='#9e9e9e'; c.fillRect(8,10,16,10);
      c.fillStyle='#b8b8b8'; c.fillRect(10,8,10,7);
      c.fillStyle='#d0d0d0'; c.fillRect(11,9,5,3);
      c.fillStyle='#555555'; c.fillRect(9,22,14,4);
      break;
    }
    case T_WATER: {
      c.fillStyle='#2c6eaa'; c.fillRect(0,0,TS,TS);
      c.fillStyle='#3a82c4'; c.fillRect(0,4,TS,4); c.fillRect(0,16,TS,4);
      c.fillStyle='#70b8e8'; c.fillRect(4,6,8,2); c.fillRect(18,18,10,2); c.fillRect(2,20,6,2);
      break;
    }
    case T_SAND: {
      c.fillStyle='#d4b06a'; c.fillRect(0,0,TS,TS);
      c.fillStyle='#c09848'; [[3,8],[16,4],[22,20],[8,24],[28,14]].forEach(([x,y])=>c.fillRect(x,y,2,2));
      c.fillStyle='#e8cc80'; [[10,14],[20,8]].forEach(([x,y])=>c.fillRect(x,y,3,3));
      break;
    }
    case T_PATH: {
      c.fillStyle='#b89458'; c.fillRect(0,0,TS,TS);
      c.fillStyle='#a07840'; [[2,4],[14,18],[24,8],[6,26],[20,28]].forEach(([x,y])=>c.fillRect(x,y,4,2));
      c.fillStyle='#ccaa70'; c.fillRect(2,2,2,2); c.fillRect(28,22,2,2);
      break;
    }
    case T_WALL: {
      // Invisible solid – render as plain grass so the house sprite goes on top
      c.fillStyle = '#5c9e3a'; c.fillRect(0,0,TS,TS);
      break;
    }
    default: {
      c.fillStyle = '#5c9e3a'; c.fillRect(0,0,TS,TS);
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
  x: (MAP_W/2)*TS, y: (MAP_H/2)*TS,
  w: 20, h: 28,
  dir: 'down', moving: false, animFrame: 0, animTimer: 0,
  attacking: false, attackTimer: 0, attackCooldown: 0, attackHit: new Set(),
  hearts: 3, maxHearts: 3, invincible: 0, coins: 0, hasBow: false,
};

// ─── Camera ───────────────────────────────────────────────────────────────────
const cam = { x: 0, y: 0 };
function updateCamera() {
  cam.x = player.x + player.w/2 - canvas.width/2;
  cam.y = player.y + player.h/2 - canvas.height/2;
  cam.x = Math.max(0, Math.min(cam.x, MAP_W*TS - canvas.width));
  cam.y = Math.max(0, Math.min(cam.y, MAP_H*TS - canvas.height));
}

// ─── Input ────────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  GameAudio.init(); // resume / start AudioContext on first user gesture
  keys[e.key] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  if ((e.key === 'z' || e.key === 'Z' || e.key === ' ') && !e.repeat) {
    e.preventDefault();
    if (gameState === 'dead') { restartGame(); return; }
    if (!shopOpen) tryAttack();
  }
  if ((e.key === 'e' || e.key === 'E') && !e.repeat) {
    e.preventDefault();
    if (gameState === 'dead') return;
    if (shopOpen) {
      if (!player.hasBow && player.coins >= 5) {
        player.coins -= 5; player.hasBow = true; shopOpen = false;
        GameAudio.playCoinPickup();
        floatingTexts.push({ x: player.x+player.w/2, y: player.y-10, text: '🏹 Arco!', life: 1.4, vy: -0.5 });
      } else { shopOpen = false; }
    } else { tryOpenShop(); }
  }
  if ((e.key === 'x' || e.key === 'X') && !e.repeat && player.hasBow && gameState !== 'dead' && !shopOpen) {
    shootArrow();
  }
  if (e.key === 'Escape') { shopOpen = false; }
  if (e.key === 'Enter' && gameState === 'dead') restartGame();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

function tryAttack() {
  if (!player.attacking && player.attackCooldown <= 0) {
    player.attacking = true; player.attackTimer = 0; player.attackHit = new Set();
    GameAudio.playSwordSwing();
  }
}

// ─── Shop ─────────────────────────────────────────────────────────────────────
function tryOpenShop() {
  if (gameScene !== 'world') return;
  for (const h of houseData) {
    if (!h.isShop) continue;
    // Porta al centro della facciata sud della casa
    const doorX = h.x + TS;
    const doorY = h.y + 2*TS;
    const px = player.x + player.w/2;
    const py = player.y + player.h/2;
    const dist = Math.sqrt((px-doorX)**2 + (py-doorY)**2);
    if (dist < SHOP_INTERACT_DIST) { shopOpen = true; return; }
  }
}

function drawShopUI() {
  if (!shopOpen) return;
  const pw = 300, ph = 190;
  const bx = canvas.width/2 - pw/2, by = canvas.height/2 - ph/2;
  // Sfondo
  ctx.fillStyle = 'rgba(0,0,0,0.78)'; roundRect(ctx, bx-4, by-4, pw+8, ph+8, 10); ctx.fill();
  ctx.fillStyle = '#c8a050'; roundRect(ctx, bx, by, pw, ph, 8); ctx.fill();
  ctx.fillStyle = '#6a3a10'; roundRect(ctx, bx+4, by+4, pw-8, ph-8, 6); ctx.fill();
  // Titolo
  ctx.fillStyle = '#ffe898'; ctx.font = 'bold 16px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('⚒  N E G O Z I O  ⚒', canvas.width/2, by + 32);
  // Separatore
  ctx.fillStyle = '#c8a050'; ctx.fillRect(bx+14, by+40, pw-28, 2);
  // Oggetto: arco
  ctx.fillStyle = '#ffdd88'; ctx.font = 'bold 14px "Courier New"';
  ctx.fillText('🏹  Arco', canvas.width/2, by + 72);
  ctx.fillStyle = '#e8d5a3'; ctx.font = '12px "Courier New"';
  ctx.fillText("Prezzo: 5 monete d'oro", canvas.width/2, by + 95);
  ctx.fillText('Spara frecce con il tasto X', canvas.width/2, by + 112);
  // Stato acquisto
  if (player.hasBow) {
    ctx.fillStyle = '#88ff88'; ctx.font = 'bold 13px "Courier New"';
    ctx.fillText('✓ Già acquistato!', canvas.width/2, by + 145);
    ctx.fillStyle = '#aaaaaa'; ctx.font = '11px "Courier New"';
    ctx.fillText('[E / Esc] Chiudi', canvas.width/2, by + 168);
  } else if (player.coins >= 5) {
    ctx.fillStyle = '#88ff88'; ctx.font = 'bold 13px "Courier New"';
    ctx.fillText('[E] Compra  ·  [Esc] Chiudi', canvas.width/2, by + 145);
    ctx.fillStyle = '#f0e060'; ctx.font = '11px "Courier New"';
    ctx.fillText(`Monete: ${player.coins} / 5`, canvas.width/2, by + 168);
  } else {
    ctx.fillStyle = '#ff7766'; ctx.font = 'bold 13px "Courier New"';
    ctx.fillText(`Monete insufficienti (${player.coins}/5)`, canvas.width/2, by + 145);
    ctx.fillStyle = '#aaaaaa'; ctx.font = '11px "Courier New"';
    ctx.fillText('[E / Esc] Chiudi', canvas.width/2, by + 168);
  }
  ctx.textAlign = 'left';
}

// ─── Frecce ───────────────────────────────────────────────────────────────────
function shootArrow() {
  const cx = player.x + player.w/2, cy = player.y + player.h/2;
  let vx = 0, vy = 0;
  if      (player.dir === 'right') vx =  ARROW_SPEED;
  else if (player.dir === 'left')  vx = -ARROW_SPEED;
  else if (player.dir === 'up')    vy = -ARROW_SPEED;
  else                             vy =  ARROW_SPEED;
  arrows.push({ x: cx, y: cy, vx, vy, dist: 0, dir: player.dir });
}

function updateArrows(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    a.x += a.vx; a.y += a.vy;
    a.dist += Math.sqrt(a.vx*a.vx + a.vy*a.vy);
    const solidCheck = gameScene === 'cave' ? isCaveSolid : isSolid;
    if (solidCheck(Math.floor(a.x/TS), Math.floor(a.y/TS)) || a.dist > ARROW_MAX_DIST) {
      arrows.splice(i, 1); continue;
    }
    let hit = false;
    for (const g of goblins) {
      if (!g.alive || g.dying) continue;
      if (Math.abs(a.x - g.x) < 12 && Math.abs(a.y - g.y) < 12) {
        killGoblin(g); GameAudio.playHit(false); hit = true; break;
      }
    }
    if (!hit) for (const t of trolls) {
      if (!t.alive || t.dying) continue;
      if (Math.abs(a.x - t.x) < 18 && Math.abs(a.y - t.y) < 18) {
        t.hp--; t.hitFlash = 200; GameAudio.playHit(true);
        if (t.hp <= 0) killTroll(t);
        hit = true; break;
      }
    }
    if (!hit && dragon && dragon.alive && !dragon.dying) {
      if (a.x > dragon.x && a.x < dragon.x+60 && a.y > dragon.y && a.y < dragon.y+56) {
        dragon.hp--; dragon.hitFlash = 300; GameAudio.playHit(true);
        spawnDeathParticles(dragon.x+30, dragon.y+28, ['#ff2200','#ff6600','#ffaa00'], 8, 4, 5);
        if (dragon.hp <= 0) {
          dragon.dying = true; dragon.alive = false; dragon.deathTimer = 2500;
          spawnDeathParticles(dragon.x+30, dragon.y+24, ['#ff1100','#ff4400','#ff8800','#ffcc00'], 24, 6, 6);
          GameAudio.playTrollDeath(); killCount += 5;
        }
        hit = true;
      }
    }
    if (hit) arrows.splice(i, 1);
  }
}

function drawArrow(sx, sy, dir) {
  ctx.save();
  ctx.fillStyle = '#c8a060';
  if (dir === 'left' || dir === 'right') {
    ctx.fillRect(sx - 10, sy - 1, 20, 3);
    ctx.fillStyle = '#aaaaaa';
    if (dir === 'right') ctx.fillRect(sx + 8,  sy - 3, 5, 7);
    else                 ctx.fillRect(sx - 13, sy - 3, 5, 7);
  } else {
    ctx.fillRect(sx - 1, sy - 10, 3, 20);
    ctx.fillStyle = '#aaaaaa';
    if (dir === 'down') ctx.fillRect(sx - 3, sy + 8,  7, 5);
    else                ctx.fillRect(sx - 3, sy - 13, 7, 5);
  }
  ctx.restore();
}

// ─── Goblins ─────────────────────────────────────────────────────────────────
const goblins = [];
let killCount = 0;

function spawnGoblins() {
  goblins.length = 0;
  const cx = Math.floor(MAP_W/2), cy = Math.floor(MAP_H/2);
  const gr = seededRand(99);
  for (let i = 0; i < GOBLIN_COUNT; i++) {
    let tx, ty, att = 0;
    do {
      tx = 2 + Math.floor(gr()*(MAP_W-4));
      ty = 2 + Math.floor(gr()*(MAP_H-4));
      att++;
    } while ((isSolid(tx,ty)||(Math.abs(tx-cx)<10&&Math.abs(ty-cy)<10)||(tx>=VX&&tx<VX+VW&&ty>=VY&&ty<VY+VH)) && att<200);
    goblins.push({
      x: tx*TS+TS/2, y: ty*TS+TS/2,
      dir: 'down', alive: true, dying: false, deathTimer: 0,
      animFrame: 0, animTimer: 0, hitFlash: 0,
      wanderAngle: gr()*Math.PI*2, wanderTimer: 0,
      attackCooldown: 1000 + gr()*2000,
    });
  }
}

function updateGoblins(dt) {
  for (const g of goblins) {
    if (g.dying) { g.deathTimer -= dt; if (g.deathTimer<=0) g.dying=false; continue; }
    if (!g.alive) continue;
    if (g.hitFlash > 0) g.hitFlash -= dt;

    const ddx = player.x+player.w/2 - g.x, ddy = player.y+player.h/2 - g.y;
    const dist = Math.sqrt(ddx*ddx + ddy*ddy);

    if (dist < 22) {
      g.attackCooldown -= dt;
      if (g.attackCooldown <= 0) {
        g.attackCooldown = GOBLIN_ATK_CD + (Math.random()*400-200);
        if (player.invincible <= 0) {
          player.hearts = Math.max(0, player.hearts-1);
          player.invincible = PLAYER_INVINCIBLE;
          GameAudio.playPlayerHit();
          if (player.hearts === 0) { gameState = 'dead'; GameAudio.playGameOver(); }
        }
      }
    } else { if (g.attackCooldown > 0) g.attackCooldown -= dt; }

    let mx = 0, my = 0;
    if (dist < DETECT_RANGE && dist > 4) {
      mx = (ddx/dist)*GOBLIN_SPEED; my = (ddy/dist)*GOBLIN_SPEED;
    } else {
      g.wanderTimer -= dt;
      if (g.wanderTimer <= 0) { g.wanderAngle += (Math.random()-0.5)*Math.PI; g.wanderTimer = 1200+Math.random()*1600; }
      mx = Math.cos(g.wanderAngle)*GOBLIN_SPEED*0.35; my = Math.sin(g.wanderAngle)*GOBLIN_SPEED*0.35;
    }
    if (Math.abs(mx)>Math.abs(my)) g.dir = mx>0?'right':'left';
    else if (my!==0) g.dir = my>0?'down':'up';

    const mg=4, nx=g.x+mx, ny=g.y+my;
    const canX = !isSolid(Math.floor((nx+mg)/TS),Math.floor(g.y/TS)) && !isSolid(Math.floor((nx-mg)/TS),Math.floor(g.y/TS));
    const canY = !isSolid(Math.floor(g.x/TS),Math.floor((ny+mg)/TS)) && !isSolid(Math.floor(g.x/TS),Math.floor((ny-mg)/TS));
    if (canX) g.x = nx; if (canY) g.y = ny;
    if (mx!==0||my!==0) { g.animTimer+=dt; if(g.animTimer>=200){g.animTimer=0;g.animFrame=(g.animFrame+1)%4;} }
  }
}

// ─── Trolls ───────────────────────────────────────────────────────────────────
const trolls = [];

// ─── Village & Campfires ──────────────────────────────────────────────────────
const houseData      = [];   // { x, y, variant } – world top-left of 2×2 tile area
const wellData       = [];   // { x, y }
const campfires      = [];   // { x, y, cooldown, restTimer, animTimer, animFrame }
const floatingTexts  = [];   // { x, y, text, life, vy }
const arrows         = [];   // { x, y, vx, vy, dist, dir }
let   shopOpen       = false;
const houseCanvases  = {};
const campfireFrames = [];

// ─── Cave / Dragon state ──────────────────────────────────────────────────────
let   gameScene       = 'world';  // 'world' | 'cave'
let   transitionAlpha = 0;        // 0-1 fade
let   transitionDir   = 0;        // 1=fading to black, -1=fading back, 0=idle
let   sceneAfterFade  = null;
let   dragonDefeated  = false;
const caveMap         = [];
const fireballs       = [];
const caveTileCache   = {};
let   dragon          = null;
let   caveAnimTick    = 0;

function spawnTrolls() {
  trolls.length = 0;
  const cx = Math.floor(MAP_W/2), cy = Math.floor(MAP_H/2);
  const tr = seededRand(777);
  for (let i = 0; i < TROLL_COUNT; i++) {
    let tx, ty, att = 0;
    do {
      tx = 3 + Math.floor(tr()*(MAP_W-6));
      ty = 3 + Math.floor(tr()*(MAP_H-6));
      att++;
    } while ((isSolid(tx,ty)||(Math.abs(tx-cx)<18&&Math.abs(ty-cy)<18)||(tx>=VX&&tx<VX+VW&&ty>=VY&&ty<VY+VH)) && att<300);
    trolls.push({
      x: tx*TS+TS/2, y: ty*TS+TS/2,
      dir: 'down', alive: true, dying: false, deathTimer: 0,
      hp: TROLL_HP, animFrame: 0, animTimer: 0, hitFlash: 0,
      wanderAngle: tr()*Math.PI*2, wanderTimer: 0,
      attackCooldown: 2000 + tr()*2000,
    });
  }
}

function placeVillage() {
  houseData.length = 0;
  wellData.length  = 0;

  // Clear village area to grass
  for (let y = VY; y < VY+VH; y++)
    for (let x = VX; x < VX+VW; x++)
      map[y][x] = T_GRASS;

  // Main horizontal road (2 tiles wide)
  for (let x = VX; x < VX+VW; x++) {
    map[VY+6][x] = T_PATH;
    map[VY+7][x] = T_PATH;
  }
  // Main vertical road
  for (let y = VY; y < VY+VH; y++) map[y][VX+7] = T_PATH;

  // Connector paths: north houses → road (rows VY+3 to VY+5 = 7–9)
  for (let y = VY+3; y <= VY+5; y++) {
    map[y][VX+2] = T_PATH;  // to NW house south face
    map[y][VX+9] = T_PATH;  // to NE house south face
  }
  // Connector paths: south houses → road (row VY+8 = 12, gap between road y=11 and house y=13)
  map[VY+8][VX+2] = T_PATH;
  map[VY+8][VX+9] = T_PATH;

  // 4 Houses – 2×2 tile solid footprints
  const defs = [
    { tx: VX+1, ty: VY+1, variant: 0 },  // NW – red roof
    { tx: VX+9, ty: VY+1, variant: 1, isShop: true },  // NE – negozio (tetto ardesia)
    { tx: VX+1, ty: VY+9, variant: 2 },  // SW – green roof
    { tx: VX+9, ty: VY+9, variant: 0 },  // SE – red roof
  ];
  for (const h of defs) {
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 2; dx++)
        map[h.ty+dy][h.tx+dx] = T_WALL;
    houseData.push({ x: h.tx*TS, y: h.ty*TS, variant: h.variant, isShop: !!h.isShop });
  }

  // Well (decorative, not solid) at road intersection
  wellData.push({ x: (VX+7)*TS + TS/2, y: (VY+6)*TS + TS/2 });

  // Extend road a few tiles south of village
  for (let y = VY+VH; y < VY+VH+6; y++)
    if (map[y] && !isSolid(VX+7, y)) map[y][VX+7] = T_PATH;
}

function spawnCampfires() {
  campfires.length = 0;
  const spots = [
    { tx: VX+VW+3, ty: VY+6 },  // east of village, near road level
    { tx: 44,       ty: 44  },  // far south-east
  ];
  for (const s of spots) {
    // Clear trees/rocks in a small area around the fire
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = s.tx+dx, ny = s.ty+dy;
        if (map[ny] && nx > 0 && nx < MAP_W-1 && ny > 0 && ny < MAP_H-1) {
          if (map[ny][nx] === T_TREE || map[ny][nx] === T_ROCK)
            map[ny][nx] = T_GRASS;
        }
      }
    campfires.push({
      x: s.tx*TS + TS/2,  y: s.ty*TS + TS/2,
      cooldown: 0,  restTimer: 0,  animTimer: 0,  animFrame: 0,
    });
  }
}

// ─── Cave setup ───────────────────────────────────────────────────────────────
function placeCaveEntrance() {
  // Clear a comfortable approach area around the entrance
  for (let dy = -3; dy <= 4; dy++)
    for (let dx = -4; dx <= 4; dx++) {
      const wy = CAVE_ENT_TY+dy, wx = CAVE_ENT_TX+dx;
      if (wy>=1&&wy<MAP_H-1&&wx>=1&&wx<MAP_W-1) map[wy][wx] = T_GRASS;
    }
  // Rock pillars flanking the opening
  for (let dy = -2; dy <= 0; dy++) {
    map[CAVE_ENT_TY+dy][CAVE_ENT_TX-2] = T_ROCK;
    map[CAVE_ENT_TY+dy][CAVE_ENT_TX-1] = T_ROCK;
    map[CAVE_ENT_TY+dy][CAVE_ENT_TX+1] = T_ROCK;
    map[CAVE_ENT_TY+dy][CAVE_ENT_TX+2] = T_ROCK;
  }
  map[CAVE_ENT_TY-2][CAVE_ENT_TX] = T_ROCK; // top cap
  map[CAVE_ENT_TY  ][CAVE_ENT_TX] = T_PATH; // walkable entry tile
  // Seed cave map from the constant template
  for (let y=0;y<CAVE_H;y++) { caveMap[y]=[]; for (let x=0;x<CAVE_W;x++) caveMap[y][x]=CAVE_MAP[y][x]; }
}

function initCave() {
  fireballs.length = 0;
  caveAnimTick = 0;
  if (!dragonDefeated) {
    dragon = {
      x: 11*TS, y: 3*TS,
      hp: DRAGON_HP_MAX, dir: 'right', alive: true, dying: false, deathTimer: 0,
      animFrame: 0, animTimer: 0, hitFlash: 0,
      fireBreathCooldown: 3000, state: 'patrol', patrolDir: 1, patrolTimer: 2500,
    };
  }
  player.x = 11*TS+8; player.y = 14*TS; player.dir = 'up';
}

function startTransition(dest) {
  sceneAfterFade = dest; transitionDir = 1; transitionAlpha = 0;
}

function updateTransition(dt) {
  if (transitionDir === 0) return;
  transitionAlpha = Math.max(0, Math.min(1, transitionAlpha + dt*0.0035*transitionDir));
  if (transitionDir === 1 && transitionAlpha >= 1) {
    if (sceneAfterFade === 'cave') { gameScene = 'cave'; initCave(); }
    else {
      gameScene = 'world';
      player.x = CAVE_ENT_TX*TS; player.y = (CAVE_ENT_TY+1)*TS; player.dir = 'down';
    }
    transitionDir = -1;
  }
  if (transitionDir === -1 && transitionAlpha <= 0) {
    transitionAlpha = 0; transitionDir = 0; sceneAfterFade = null;
  }
}

// ─── Cave collision helpers ───────────────────────────────────────────────────
function isCaveSolid(tx, ty) {
  if (tx<0||ty<0||tx>=CAVE_W||ty>=CAVE_H) return true;
  return caveMap[ty][tx] === C_WALL;
}
function isCaveLava(tx, ty) {
  if (tx<0||ty<0||tx>=CAVE_W||ty>=CAVE_H) return false;
  return caveMap[ty][tx] === C_LAVA;
}
function canMoveCave(px, py, mg) {
  return !isCaveSolid(Math.floor((px+mg)/TS),           Math.floor((py+mg)/TS)) &&
         !isCaveSolid(Math.floor((px+player.w-mg)/TS),  Math.floor((py+mg)/TS)) &&
         !isCaveSolid(Math.floor((px+mg)/TS),           Math.floor((py+player.h-2)/TS)) &&
         !isCaveSolid(Math.floor((px+player.w-mg)/TS),  Math.floor((py+player.h-2)/TS));
}

// ─── Cave scene update ────────────────────────────────────────────────────────
function updateCave(dt) {
  if (gameState === 'dead') return;
  if (player.invincible > 0) player.invincible = Math.max(0, player.invincible-dt);

  if (player.attacking) {
    player.attackTimer += dt;
    checkDragonHit();
    if (player.attackTimer >= ATTACK_DURATION) {
      player.attacking=false; player.attackTimer=0; player.attackCooldown=ATTACK_COOLDOWN;
    }
  }
  if (player.attackCooldown > 0) player.attackCooldown = Math.max(0, player.attackCooldown-dt);

  let dx=0, dy=0;
  if (keys['ArrowLeft'] ||keys['a']) { dx=-1; player.dir='left';  }
  if (keys['ArrowRight']||keys['d']) { dx= 1; player.dir='right'; }
  if (keys['ArrowUp']   ||keys['w']) { dy=-1; player.dir='up';    }
  if (keys['ArrowDown'] ||keys['s']) { dy= 1; player.dir='down';  }
  const spd = player.attacking ? SPEED*0.35 : SPEED;
  player.moving = dx!==0||dy!==0;
  if (player.moving) {
    if (dx!==0&&dy!==0){dx*=0.7071;dy*=0.7071;}
    const nx=player.x+dx*spd, ny=player.y+dy*spd, mg=3;
    const cX=canMoveCave(nx,player.y,mg), cY=canMoveCave(player.x,ny,mg);
    if(cX&&cY){player.x=nx;player.y=ny;}else if(cX){player.x=nx;}else if(cY){player.y=ny;}
    player.animTimer+=dt;
    if(player.animTimer>=ANIM_RATE){player.animTimer-=ANIM_RATE;player.animFrame=(player.animFrame+1)%4;}
  } else { player.animFrame=0; player.animTimer=0; }
  player.x=Math.max(TS,    Math.min((CAVE_W-2)*TS-player.w, player.x));
  player.y=Math.max(TS/2,  Math.min((CAVE_H-2)*TS-player.h, player.y));

  // Lava damage
  const lx=Math.floor((player.x+player.w/2)/TS), ly=Math.floor((player.y+player.h-4)/TS);
  if (isCaveLava(lx,ly) && player.invincible<=0) {
    player.hearts--; player.invincible=PLAYER_INVINCIBLE;
    GameAudio.playPlayerHit();
    if (player.hearts<=0) { gameState='dead'; GameAudio.playGameOver(); }
  }

  // Exit (walk south through the bottom opening at tiles 11-12 row 15)
  const pyT=Math.floor((player.y+player.h)/TS);
  const pxT=Math.floor((player.x+player.w/2)/TS);
  if (pyT>=15 && pxT>=11 && pxT<=12 && player.dir==='down' && transitionDir===0) {
    startTransition('world');
  }

  caveAnimTick += dt;
  updateDragon(dt);
  updateFireballs(dt);
  updateArrows(dt);
  updateParticles(dt);
  updateFloatingTexts(dt);
  updateCoins(dt);
}

function checkDragonHit() {
  if (!dragon||!dragon.alive||dragon.dying) return;
  if (player.attackHit.has('dragon')) return;
  const ar=22;
  let ax=player.x, ay=player.y, aw=player.w, ah=ar;
  if      (player.dir==='down') { ay=player.y+player.h; ah=ar; }
  else if (player.dir==='up')   { ay=player.y-ar;       ah=ar; }
  else if (player.dir==='left') { ax=player.x-ar;       aw=ar; ah=player.h; }
  else                          { ax=player.x+player.w; aw=ar; ah=player.h; }
  if (ax<dragon.x+60&&ax+aw>dragon.x&&ay<dragon.y+56&&ay+ah>dragon.y) {
    player.attackHit.add('dragon');
    dragon.hp--; dragon.hitFlash=300;
    GameAudio.playHit(true);
    spawnDeathParticles(dragon.x+30,dragon.y+28,['#ff2200','#ff6600','#ffaa00'],8,4,5);
    if (dragon.hp<=0) {
      dragon.dying=true; dragon.alive=false; dragon.deathTimer=2500;
      spawnDeathParticles(dragon.x+30,dragon.y+24,['#ff1100','#ff4400','#ff8800','#ffcc00'],24,6,6);
      GameAudio.playTrollDeath(); killCount+=5;
    }
  }
}

function updateDragon(dt) {
  if (!dragon) return;
  if (dragon.hitFlash>0) dragon.hitFlash-=dt;
  if (dragon.dying) {
    dragon.deathTimer-=dt;
    if (dragon.deathTimer<=0) {
      dragon.dying=false; dragonDefeated=true;
      for (let i=0;i<8;i++) spawnCoin(dragon.x+20+Math.random()*20, dragon.y+20+Math.random()*16);
    }
    return;
  }
  if (!dragon.alive) return;
  dragon.animTimer+=dt;
  if (dragon.animTimer>=350){dragon.animTimer=0;dragon.animFrame=(dragon.animFrame+1)%4;}
  if (dragon.fireBreathCooldown>0) dragon.fireBreathCooldown-=dt;

  const ddx=player.x+player.w/2-(dragon.x+30);
  const ddy=player.y+player.h/2-(dragon.y+28);
  const dist=Math.sqrt(ddx*ddx+ddy*ddy);

  if (dragon.state==='patrol') {
    dragon.patrolTimer-=dt;
    if (dragon.patrolTimer<=0){dragon.patrolDir*=-1;dragon.patrolTimer=2000+Math.random()*2000;}
    const nx=dragon.x+dragon.patrolDir*DRAGON_SPEED*0.5;
    const tx=Math.floor((nx+(dragon.patrolDir>0?62:0))/TS), ty=Math.floor((dragon.y+28)/TS);
    if (!isCaveSolid(tx,ty)) dragon.x=nx; else {dragon.patrolDir*=-1;dragon.patrolTimer=1000;}
    dragon.dir=dragon.patrolDir>0?'right':'left';
    if (dist<DRAGON_DETECT) dragon.state='chase';
  } else {
    const spd=dragon.hp<=3?DRAGON_SPEED*1.6:DRAGON_SPEED;
    if (dist>8) {
      const mx=(ddx/dist)*spd, my=(ddy/dist)*spd;
      if(!isCaveSolid(Math.floor((dragon.x+(mx>0?64:0))/TS),Math.floor((dragon.y+28)/TS))) dragon.x+=mx;
      if(!isCaveSolid(Math.floor((dragon.x+30)/TS),Math.floor((dragon.y+(my>0?58:0))/TS))) dragon.y+=my;
      dragon.x=Math.max(TS,Math.min((CAVE_W-3)*TS-60,dragon.x));
      dragon.y=Math.max(TS,Math.min((CAVE_H-4)*TS-56,dragon.y));
      if(Math.abs(ddx)>Math.abs(ddy)) dragon.dir=ddx>0?'right':'left';
      else dragon.dir=ddy>0?'down':'up';
    }
    if (dist<320&&dragon.fireBreathCooldown<=0) {
      const angle=Math.atan2(ddy,ddx);
      const n=dragon.hp<=3?5:3;
      for (let i=0;i<n;i++) {
        const a=angle+(i-(n-1)/2)*(Math.PI/7);
        fireballs.push({x:dragon.x+30,y:dragon.y+40,vx:Math.cos(a)*FIREBALL_SPEED,vy:Math.sin(a)*FIREBALL_SPEED,life:3000});
      }
      dragon.fireBreathCooldown=dragon.hp<=3?FIREBALL_CD*0.55:FIREBALL_CD;
      if (GameAudio.playFireBreath) GameAudio.playFireBreath();
    }
    if (dist>DRAGON_DETECT*1.5) dragon.state='patrol';
  }
}

function updateFireballs(dt) {
  for (let i=fireballs.length-1;i>=0;i--) {
    const fb=fireballs[i];
    fb.x+=fb.vx; fb.y+=fb.vy; fb.life-=dt;
    if (isCaveSolid(Math.floor(fb.x/TS),Math.floor(fb.y/TS))||fb.life<=0) {
      spawnDeathParticles(fb.x,fb.y,['#ff4400','#ff8800','#ffee00'],4,2,3);
      fireballs.splice(i,1); continue;
    }
    if (player.invincible<=0) {
      const dx2=player.x+player.w/2-fb.x, dy2=player.y+player.h/2-fb.y;
      if (dx2*dx2+dy2*dy2<16*16) {
        player.hearts--; player.invincible=PLAYER_INVINCIBLE;
        spawnDeathParticles(fb.x,fb.y,['#ff4400','#ff8800'],5,2,3);
        fireballs.splice(i,1);
        if(player.hearts<=0){gameState='dead';GameAudio.playGameOver();}else GameAudio.playPlayerHit();
        continue;
      }
    }
  }
}

function updateTrolls(dt) {
  for (const t of trolls) {
    if (t.dying) { t.deathTimer -= dt; if (t.deathTimer<=0) t.dying=false; continue; }
    if (!t.alive) continue;
    if (t.hitFlash > 0) t.hitFlash -= dt;

    const ddx = player.x+player.w/2 - t.x, ddy = player.y+player.h/2 - t.y;
    const dist = Math.sqrt(ddx*ddx + ddy*ddy);

    // Trolls hit harder range (they're bigger)
    if (dist < 30) {
      t.attackCooldown -= dt;
      if (t.attackCooldown <= 0) {
        t.attackCooldown = TROLL_ATK_CD + (Math.random()*600-300);
        if (player.invincible <= 0) {
          player.hearts = Math.max(0, player.hearts-1);
          player.invincible = PLAYER_INVINCIBLE;
          GameAudio.playPlayerHit();
          if (player.hearts === 0) { gameState = 'dead'; GameAudio.playGameOver(); }
        }
      }
    } else { if (t.attackCooldown > 0) t.attackCooldown -= dt; }

    let mx = 0, my = 0;
    if (dist < DETECT_RANGE+60 && dist > 6) {
      mx = (ddx/dist)*TROLL_SPEED; my = (ddy/dist)*TROLL_SPEED;
    } else {
      t.wanderTimer -= dt;
      if (t.wanderTimer <= 0) { t.wanderAngle += (Math.random()-0.5)*Math.PI; t.wanderTimer = 2000+Math.random()*2000; }
      mx = Math.cos(t.wanderAngle)*TROLL_SPEED*0.3; my = Math.sin(t.wanderAngle)*TROLL_SPEED*0.3;
    }
    if (Math.abs(mx)>Math.abs(my)) t.dir = mx>0?'right':'left';
    else if (my!==0) t.dir = my>0?'down':'up';

    const mg=6, nx=t.x+mx, ny=t.y+my;
    const canX = !isSolid(Math.floor((nx+mg)/TS),Math.floor(t.y/TS)) && !isSolid(Math.floor((nx-mg)/TS),Math.floor(t.y/TS));
    const canY = !isSolid(Math.floor(t.x/TS),Math.floor((ny+mg)/TS)) && !isSolid(Math.floor(t.x/TS),Math.floor((ny-mg)/TS));
    if (canX) t.x = nx; if (canY) t.y = ny;
    if (mx!==0||my!==0) { t.animTimer+=dt; if(t.animTimer>=280){t.animTimer=0;t.animFrame=(t.animFrame+1)%4;} }
  }
}

// ─── Coins ────────────────────────────────────────────────────────────────────
const coins = [];
function spawnCoin(x, y) { coins.push({ x, y, bobOffset: Math.random()*Math.PI*2, age: 0 }); }
function updateCoins(dt) {
  for (let i = coins.length-1; i >= 0; i--) {
    const c = coins[i]; c.age += dt*0.003;
    const ddx = player.x+player.w/2 - c.x, ddy = player.y+player.h/2 - c.y;
    if (Math.sqrt(ddx*ddx+ddy*ddy) < COIN_PICKUP_DIST) { player.coins++; coins.splice(i,1); GameAudio.playCoinPickup(); }
  }
}

function updateCampfires(dt) {
  for (const cf of campfires) {
    cf.animTimer += dt;
    if (cf.animTimer >= 180) { cf.animTimer -= 180; cf.animFrame = (cf.animFrame+1) % 4; }
    if (cf.cooldown > 0) { cf.cooldown = Math.max(0, cf.cooldown-dt); continue; }

    const ddx = player.x + player.w/2 - cf.x;
    const ddy = player.y + player.h/2 - cf.y;
    const dist = Math.sqrt(ddx*ddx + ddy*ddy);

    if (dist < CAMPFIRE_RANGE && player.hearts < player.maxHearts) {
      cf.restTimer = Math.min(CAMPFIRE_HEAL_TIME, cf.restTimer + dt);
      if (cf.restTimer >= CAMPFIRE_HEAL_TIME) {
        player.hearts = Math.min(player.maxHearts, player.hearts + 1);
        cf.cooldown   = CAMPFIRE_COOLDOWN;
        cf.restTimer  = 0;
        GameAudio.playHeal();
        floatingTexts.push({ x: player.x+player.w/2, y: player.y-10, text: '+♥', life: 1.0, vy: -0.45 });
      }
    } else {
      cf.restTimer = Math.max(0, cf.restTimer - dt * 0.5);
    }
  }
}

function updateFloatingTexts(dt) {
  for (let i = floatingTexts.length-1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y   += ft.vy;
    ft.life -= dt * 0.00085;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}

// ─── Particles ────────────────────────────────────────────────────────────────
const particles = [];
function spawnDeathParticles(x, y, colors, count, speed, size) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI*2*i)/count + (Math.random()-0.5)*0.6;
    const spd = speed*(0.6 + Math.random()*0.8);
    particles.push({
      x, y, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd - 1,
      life: 1, decay: 0.018+Math.random()*0.018,
      size: size*(0.5+Math.random()*0.8),
      color: colors[Math.floor(Math.random()*colors.length)],
    });
  }
}
function updateParticles(dt) {
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.08; p.life-=p.decay;
    if (p.life<=0) particles.splice(i,1);
  }
}

// ─── Kill goblin / troll ──────────────────────────────────────────────────────
function killGoblin(g) {
  g.alive=false; g.dying=true; g.deathTimer=DEATH_DUR; g.hitFlash=120; killCount++;
  spawnDeathParticles(g.x,g.y,['#cc2222','#aa1111','#ff5544','#882200','#ff8833'],10,2.5,3.5);
  spawnCoin(g.x, g.y);
  GameAudio.playGoblinDeath();
}

function killTroll(t) {
  t.alive=false; t.dying=true; t.deathTimer=DEATH_DUR*1.5; t.hitFlash=200; killCount++;
  spawnDeathParticles(t.x,t.y,['#5a8a40','#3a6a28','#7aaa58','#2a4a18','#88cc66'],20,3.5,5);
  GameAudio.playTrollDeath();
  // Drops 3 coins in a triangle pattern
  for (let i = 0; i < 3; i++) {
    const a = (Math.PI*2*i)/3 - Math.PI/2;
    spawnCoin(t.x + Math.cos(a)*14, t.y + Math.sin(a)*14);
  }
}

// ─── Attack hitbox ────────────────────────────────────────────────────────────
function getAttackRect() {
  const range = 42;
  switch (player.dir) {
    case 'right': return {x:player.x+player.w,   y:player.y-6,       w:range, h:player.h+12};
    case 'left':  return {x:player.x-range,       y:player.y-6,       w:range, h:player.h+12};
    case 'up':    return {x:player.x-6,           y:player.y-range,   w:player.w+12, h:range};
    case 'down':  return {x:player.x-6,           y:player.y+player.h,w:player.w+12, h:range};
  }
}

function checkAttackHits() {
  const progress = player.attackTimer / ATTACK_DURATION;
  if (progress < 0.1 || progress > 0.7) return;
  const ar = getAttackRect();

  for (const g of goblins) {
    if (!g.alive||g.dying||player.attackHit.has(g)) continue;
    if (g.x+9>ar.x&&g.x-9<ar.x+ar.w&&g.y+9>ar.y&&g.y-9<ar.y+ar.h) {
      g.hitFlash=120; killGoblin(g); player.attackHit.add(g);
      GameAudio.playHit(false);
    }
  }
  for (const t of trolls) {
    if (!t.alive||t.dying||player.attackHit.has(t)) continue;
    if (t.x+14>ar.x&&t.x-14<ar.x+ar.w&&t.y+14>ar.y&&t.y-14<ar.y+ar.h) {
      t.hp--; t.hitFlash=200; player.attackHit.add(t);
      GameAudio.playHit(true);
      if (t.hp <= 0) killTroll(t);
    }
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────
function update(dt) {
  updateTransition(dt);
  if (transitionDir !== 0 && transitionAlpha > 0.85) return; // freeze at fade peak
  if (gameScene === 'cave') { updateCave(dt); return; }

  if (gameState === 'dead') return;

  // Negozio aperto: blocca movimento e combattimento
  if (shopOpen) {
    updateFloatingTexts(dt);
    return;
  }

  if (player.invincible > 0) player.invincible = Math.max(0, player.invincible-dt);

  if (player.attacking) {
    player.attackTimer += dt;
    checkAttackHits();
    if (player.attackTimer >= ATTACK_DURATION) {
      player.attacking=false; player.attackTimer=0; player.attackCooldown=ATTACK_COOLDOWN;
    }
  }
  if (player.attackCooldown > 0) player.attackCooldown = Math.max(0, player.attackCooldown-dt);

  let dx=0, dy=0;
  if (keys['ArrowLeft'] ||keys['a']) { dx=-1; player.dir='left';  }
  if (keys['ArrowRight']||keys['d']) { dx= 1; player.dir='right'; }
  if (keys['ArrowUp']   ||keys['w']) { dy=-1; player.dir='up';    }
  if (keys['ArrowDown'] ||keys['s']) { dy= 1; player.dir='down';  }

  const spd = player.attacking ? SPEED*0.35 : SPEED;
  player.moving = dx!==0||dy!==0;
  if (player.moving) {
    if (dx!==0&&dy!==0) { dx*=0.7071; dy*=0.7071; }
    const nx=player.x+dx*spd, ny=player.y+dy*spd, mg=3;
    const canX=canMove(nx,player.y,mg), canY=canMove(player.x,ny,mg);
    if (canX&&canY){player.x=nx;player.y=ny;} else if(canX){player.x=nx;} else if(canY){player.y=ny;}
    player.animTimer+=dt;
    if (player.animTimer>=ANIM_RATE) { player.animTimer-=ANIM_RATE; player.animFrame=(player.animFrame+1)%4; }
  } else { player.animFrame=0; player.animTimer=0; }

  // Cave entrance trigger: walk north into the opening
  if (transitionDir===0) {
    const entX=(CAVE_ENT_TX)*TS+TS/2, entY=(CAVE_ENT_TY-1)*TS+TS/2;
    const px=player.x+player.w/2, py=player.y+player.h/2;
    if (Math.abs(px-entX)<TS*0.75 && Math.abs(py-entY)<TS*0.75 && player.dir==='up') {
      startTransition('cave');
    }
  }

  updateGoblins(dt); updateTrolls(dt); updateCoins(dt);
  updateCampfires(dt); updateFloatingTexts(dt); updateParticles(dt);
  updateArrows(dt);
}

function canMove(px,py,mg) {
  return !isSolid(Math.floor((px+mg)/TS),          Math.floor((py+mg)/TS)) &&
         !isSolid(Math.floor((px+player.w-mg)/TS),  Math.floor((py+mg)/TS)) &&
         !isSolid(Math.floor((px+mg)/TS),            Math.floor((py+player.h-2)/TS)) &&
         !isSolid(Math.floor((px+player.w-mg)/TS),   Math.floor((py+player.h-2)/TS));
}

// ─── Arc slash helper (drawn in local sprite coords) ──────────────────────────
function arcSlash(cx, cy, r, a0, a1, swingT, ccw) {
  ctx.save();
  ctx.globalAlpha = swingT * 0.65;
  ctx.strokeStyle = '#ffffa0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1, ccw); ctx.stroke();
  ctx.globalAlpha = swingT * 0.3;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1, ccw); ctx.stroke();
  ctx.restore();
}

// ─── Knight sprite ────────────────────────────────────────────────────────────
function drawKnight(ox, oy, dir, frame, moving, attacking, attackProgress) {
  ctx.save();
  ctx.translate(Math.round(ox), Math.round(oy));

  const bob     = (moving && frame%2===1) ? 1 : 0;
  const swingT  = attacking ? Math.sin(attackProgress*Math.PI) : 0;
  const swingOut = swingT;
  const px = (x,y,w,h,col) => { ctx.fillStyle=col; ctx.fillRect(x,y+bob,w,h); };

  ctx.fillStyle='rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(12,34,9,3,0,0,Math.PI*2); ctx.fill();

  if (dir==='down') {
    const legSwap = moving&&frame%4>=2;
    px(7, 22,5,legSwap?10:8,'#334499'); px(13,22,5,legSwap?8:10,'#334499');
    px(6, 30,7,4,'#2a1e14'); px(12,30,7,4,'#2a1e14'); px(6,33,7,2,'#1a0e06'); px(12,33,7,2,'#1a0e06');
    px(5, 14,15,10,'#6677bb'); px(7,15,11,8,'#8899dd'); px(9,16,7,6,'#aabcee');
    px(5, 23,15,2,'#5a3a14'); px(9,23,4,2,'#cc9933');
    px(0, 14,6,10,'#bb2222'); px(1,15,4,8,'#dd3333'); px(1,17,4,4,'#ffcc22'); px(2,18,2,2,'#ffffff');
    // Sword swings downward
    const sdx=Math.round(swingOut*4), sdy=Math.round(swingOut*10);
    px(20,14,5,8,'#6677bb');
    px(22+sdx,2+sdy-6,3,14,'#cccccc'); px(22+sdx,1+sdy-6,3,3,'#e8e8e8'); px(19+sdx,12+sdy-3,9,2,'#aa7722');
    // Arc: bottom half (0 → PI)
    if (attacking&&swingT>0.05) arcSlash(14,22, 16+swingOut*6, 0,Math.PI, swingT, false);
    px(9, 10,8,5,'#e8c888');
    px(7, 5,12,9,'#8899aa'); px(8,4,10,3,'#aabbcc'); px(9,2,8,4,'#c0d4e0');
    px(8, 8,10,3,'#1e2233'); px(9,8,4,2,'#334466'); px(13,8,4,2,'#334466');
    px(10,8,2,2,'#ffdd44'); px(14,8,2,2,'#ffdd44');
    px(11,0,4,4,'#cc2222'); px(12,-2,2,4,'#ff4444');

  } else if (dir==='up') {
    const legSwap = moving&&frame%4>=2;
    px(7, 22,5,legSwap?10:8,'#334499'); px(13,22,5,legSwap?8:10,'#334499');
    px(6, 30,7,4,'#2a1e14'); px(12,30,7,4,'#2a1e14');
    px(5, 14,15,10,'#5566aa'); px(7,15,11,8,'#7788bb'); px(9,16,7,5,'#8899cc');
    px(5, 23,15,2,'#5a3a14');
    // Sword swings upward
    const suy=Math.round(-swingOut*10);
    px(20,14,5,8,'#5566aa'); px(22,1+suy,3,14,'#cccccc'); px(19,13+suy,9,2,'#aa7722');
    // Arc: top half (PI → 0)
    if (attacking&&swingT>0.05) arcSlash(14,8, 16+swingOut*6, Math.PI,0, swingT, false);
    px(0, 13,6,10,'#991111'); px(1,14,4,8,'#bb2222'); px(1,16,4,4,'#cc8811');
    px(7, 5,12,11,'#8899aa'); px(8,4,10,4,'#aabbcc'); px(9,2,8,4,'#c0d4e0'); px(9,8,8,4,'#6677aa');
    px(11,0,4,4,'#cc2222'); px(12,-2,2,4,'#ff4444');

  } else if (dir==='left') {
    const legSwap = moving&&frame%4>=2;
    px(8, 22,6,legSwap?10:8,'#334499'); px(12,22,5,legSwap?8:10,'#334499');
    px(6, 30,8,4,'#2a1e14');
    px(6, 14,13,10,'#6677bb'); px(7,15,10,8,'#8899dd'); px(8,16,8,6,'#9aabee');
    px(6, 23,13,2,'#5a3a14');
    px(0, 11,7,12,'#bb2222'); px(1,12,5,10,'#dd3333'); px(1,14,5,6,'#ffcc22'); px(2,16,3,2,'#ffffff');
    px(5, 14,5,9,'#5566aa');
    // Sword swings toward LEFT (facing direction)
    const slx=Math.round(-swingOut*10), sly=Math.round(swingOut*4);
    px(18,14,5,9,'#5566aa'); px(18+slx,2+sly,3,14,'#cccccc'); px(16+slx,13+sly,7,2,'#aa7722');
    // Arc: left half — anticlockwise from -PI/2 to PI/2 sweeps through 180° (left side)
    if (attacking&&swingT>0.05) arcSlash(6,14, 18+swingOut*6, -Math.PI*0.5,Math.PI*0.5, swingT, true);
    px(7, 9,9,5,'#e8c888');
    px(6, 4,11,10,'#8899aa'); px(7,3,9,4,'#aabbcc'); px(8,1,8,4,'#c0d4e0');
    px(6, 8,5,3,'#1e2233'); px(7,9,2,2,'#ffdd44');
    px(10,0,4,3,'#cc2222'); px(11,-2,2,4,'#ff4444');

  } else { // right
    const legSwap = moving&&frame%4>=2;
    px(10,22,6,legSwap?10:8,'#334499'); px(12,22,5,legSwap?8:10,'#334499');
    px(10,30,8,4,'#2a1e14');
    px(6, 14,13,10,'#6677bb'); px(7,15,10,8,'#8899dd'); px(9,16,8,6,'#9aabee');
    px(6, 23,13,2,'#5a3a14');
    px(2, 13,5,9,'#991111'); px(2,14,4,8,'#bb2222');
    px(3, 14,5,9,'#5566aa');
    // Sword swings toward RIGHT (facing direction)
    const srx=Math.round(swingOut*10), sry=Math.round(swingOut*4);
    px(18,14,5,9,'#5566aa'); px(19+srx,2+sry,3,14,'#cccccc'); px(17+srx,13+sry,7,2,'#aa7722');
    // Arc: right half — clockwise from -PI/2 to PI/2
    if (attacking&&swingT>0.05) arcSlash(22,14, 18+swingOut*6, -Math.PI*0.5,Math.PI*0.5, swingT, false);
    px(10,9,9,5,'#e8c888');
    px(9, 4,11,10,'#8899aa'); px(9,3,9,4,'#aabbcc'); px(10,1,8,4,'#c0d4e0');
    px(15,8,5,3,'#1e2233'); px(17,9,2,2,'#ffdd44');
    px(10,0,4,3,'#cc2222'); px(11,-2,2,4,'#ff4444');
  }

  ctx.restore();
}

// ─── Goblin sprite ────────────────────────────────────────────────────────────
function drawGoblin(ox, oy, dir, frame, alpha, flash) {
  ctx.save(); ctx.globalAlpha=alpha; ctx.translate(Math.round(ox),Math.round(oy));
  const bob=(frame%2===1)?1:0;
  const px=(x,y,w,h,col)=>{ctx.fillStyle=flash>0?'#ffffff':col; ctx.fillRect(x,y+bob,w,h);};

  ctx.fillStyle=`rgba(0,0,0,${alpha*0.2})`;
  ctx.beginPath(); ctx.ellipse(9,24,7,2.5,0,0,Math.PI*2); ctx.fill();

  if (dir==='down') {
    const ls=frame%4>=2, aw=ls;
    px(4,16,4,ls?8:6,'#7a1a00'); px(10,16,4,ls?6:8,'#7a1a00');
    px(3,22,5,3,'#4a0e00'); px(9,22,5,3,'#4a0e00');
    px(3,10,12,8,'#aa2800'); px(4,11,10,6,'#cc3300'); px(5,12,8,4,'#dd4422');
    px(0,10,4,aw?7:5,'#aa2800'); px(14,10,4,aw?5:7,'#aa2800');
    px(0,15,3,3,'#881c00'); px(15,15,3,3,'#881c00');
    px(3,2,12,9,'#cc3300'); px(4,1,10,3,'#aa2800'); px(5,3,8,6,'#ee4422');
    px(3,0,3,4,'#881c00'); px(12,0,3,4,'#881c00'); px(4,-1,2,2,'#aa2800'); px(13,-1,2,2,'#aa2800');
    px(5,4,3,3,'#ffee00'); px(10,4,3,3,'#ffee00'); px(6,5,2,2,'#000000'); px(11,5,2,2,'#000000');
    px(6,9,6,2,'#220000'); px(7,8,2,2,'#ffffff'); px(10,8,2,2,'#ffffff');
  } else if (dir==='up') {
    const ls=frame%4>=2;
    px(4,16,4,ls?8:6,'#7a1a00'); px(10,16,4,ls?6:8,'#7a1a00');
    px(3,22,5,3,'#4a0e00'); px(9,22,5,3,'#4a0e00');
    px(3,10,12,8,'#992400'); px(4,11,10,6,'#bb3000');
    px(0,10,4,6,'#992400'); px(14,10,4,6,'#992400');
    px(3,2,12,9,'#aa2800'); px(4,1,10,3,'#992400');
    px(3,0,3,4,'#771800'); px(12,0,3,4,'#771800');
  } else if (dir==='left') {
    const ls=frame%4>=2;
    px(5,16,5,ls?8:6,'#7a1a00'); px(9,16,4,ls?6:8,'#7a1a00'); px(4,22,6,3,'#4a0e00');
    px(4,10,10,8,'#aa2800'); px(5,11,8,6,'#cc3300');
    px(12,11,4,5,'#992400'); px(2,12,3,4,'#aa2800');
    px(4,2,10,9,'#cc3300'); px(5,1,8,3,'#aa2800'); px(3,3,10,6,'#ee4422');
    px(2,0,3,4,'#881c00'); px(2,-1,2,2,'#aa2800');
    px(4,5,3,3,'#ffee00'); px(5,6,2,2,'#000000'); px(5,9,5,2,'#220000'); px(6,8,2,2,'#ffffff');
  } else {
    const ls=frame%4>=2;
    px(8,16,5,ls?8:6,'#7a1a00'); px(12,16,4,ls?6:8,'#7a1a00'); px(9,22,6,3,'#4a0e00');
    px(4,10,10,8,'#aa2800'); px(5,11,8,6,'#cc3300');
    px(2,11,4,5,'#992400'); px(13,12,3,4,'#aa2800');
    px(4,2,10,9,'#cc3300'); px(5,1,8,3,'#aa2800'); px(5,3,8,6,'#ee4422');
    px(13,0,3,4,'#881c00'); px(14,-1,2,2,'#aa2800');
    px(11,5,3,3,'#ffee00'); px(12,6,2,2,'#000000'); px(9,9,5,2,'#220000'); px(11,8,2,2,'#ffffff');
  }
  ctx.restore();
}

// ─── Troll sprite ─────────────────────────────────────────────────────────────
// Bounding box ~30×42. Origin is top-left. Center at roughly (15, 26).
function drawTroll(ox, oy, dir, frame, alpha, flash, hp) {
  ctx.save(); ctx.globalAlpha=alpha; ctx.translate(Math.round(ox),Math.round(oy));
  const bob=(frame%2===1)?1:0;
  const fl=flash>0;
  const px=(x,y,w,h,col)=>{ctx.fillStyle=fl?'#ffffff':col; ctx.fillRect(x,y+bob,w,h);};

  // Shadow (bigger)
  ctx.fillStyle=`rgba(0,0,0,${alpha*0.22})`;
  ctx.beginPath(); ctx.ellipse(15,44,14,4,0,0,Math.PI*2); ctx.fill();

  if (dir==='down') {
    const ls=frame%4>=2;
    // Legs
    px(3, 30, 10,ls?12:10,'#2a5020'); px(17,30,10,ls?10:12,'#2a5020');
    px(2, 40, 12,4,'#1a3a10'); px(16,40,12,4,'#1a3a10');
    // Body
    px(1, 14, 28,18,'#4a7838'); px(3,15,24,14,'#5a8a46'); px(5,16,20,10,'#6a9e56');
    // Belt
    px(1, 31, 28,3,'#7a5020'); px(12,31,6,3,'#aa7830');
    // Left arm
    px(-4,14, 7,18,'#3a6828'); px(-3,15,5,14,'#4a7838');
    // Right arm + club
    px(27,14, 7,18,'#3a6828'); px(28,15,5,14,'#4a7838');
    // Club (right side)
    px(30, 2,  8,22,'#6a3a18'); px(31,3,  6,18,'#8a5a2a');
    px(28,-2, 12,8, '#7a4a20'); px(29,-4, 10,6, '#9a6232');
    px(29,-4,  4,2, '#c8883a'); // club highlight
    // Head
    px(3,  2, 24,14,'#4a7838'); px(5,3,  20,10,'#5a8a46'); px(7,4, 16,6,'#6a9a56');
    // Horns
    px(3, -6,  7,8, '#887040'); px(4,-8,  5,6, '#aa9050'); px(4,-9,  3,3,'#ccaa60');
    px(20,-6,  7,8, '#887040'); px(21,-8, 5,6, '#aa9050'); px(22,-9, 3,3,'#ccaa60');
    // Eyes (big angry)
    px(5,  4,  8,6, '#ffcc00'); px(17,4,  8,6, '#ffcc00');
    px(8,  5,  4,4, '#000000'); px(20,5,  4,4, '#000000');
    px(5,  4,  8,2, '#994400'); px(17,4,  8,2, '#994400'); // angry brow
    // Nose
    px(11, 8,  8,4, '#3a6828'); px(12,9,  6,3, '#2a5018');
    // Mouth + tusks
    px(5,  13,20,2, '#1a3a10');
    px(6,  11, 4,4, '#e8dfc0'); px(20,11, 4,4, '#e8dfc0'); // tusks

  } else if (dir==='up') {
    const ls=frame%4>=2;
    px(3, 30,10,ls?12:10,'#2a5020'); px(17,30,10,ls?10:12,'#2a5020');
    px(2, 40,12,4,'#1a3a10'); px(16,40,12,4,'#1a3a10');
    px(1, 14,28,18,'#3a6028'); px(3,15,24,14,'#4a7038'); px(5,16,20,10,'#5a8048');
    px(1, 31,28,3,'#7a5020');
    px(-4,14, 7,18,'#2a5018'); px(27,14, 7,18,'#2a5018');
    // Club visible over right shoulder
    px(30,2,8,22,'#6a3a18'); px(28,-2,12,6,'#7a4a20');
    // Back of head (no face)
    px(3,  2,24,14,'#3a6028'); px(5,3,20,10,'#4a7038');
    px(3, -6, 7,8,'#887040'); px(20,-6,7,8,'#887040');
    px(4, -8, 5,5,'#aa9050'); px(21,-8,5,5,'#aa9050');

  } else if (dir==='left') {
    const ls=frame%4>=2;
    px(5, 30,10,ls?12:10,'#2a5020'); px(15,30,9,ls?10:12,'#2a5020');
    px(4, 40,12,4,'#1a3a10');
    px(2, 14,24,18,'#4a7838'); px(4,15,20,14,'#5a8a46'); px(6,16,16,10,'#6a9a56');
    px(2, 31,24,3,'#7a5020');
    // Far arm (right side)
    px(24,14, 6,16,'#3a6828');
    // Near arm (left side — shield/guard)
    px(-4,14, 8,16,'#3a6828'); px(-3,15,6,12,'#4a7838');
    // Club (near arm, pointing left)
    px(-12,6, 10,22,'#6a3a18'); px(-11,7,8,18,'#8a5a2a');
    px(-14,4, 14,8,'#7a4a20'); px(-15,2,14,6,'#9a6232'); px(-14,2,5,2,'#c8883a');
    // Head (left profile)
    px(4,  2, 20,14,'#4a7838'); px(6,3,16,10,'#5a8a46'); px(4,3,18,6,'#6a9a56');
    px(2, -6, 7,8,'#887040'); px(3,-8,5,5,'#aa9050'); px(3,-9,3,3,'#ccaa60');
    // Eye (left)
    px(4,  5, 8,5,'#ffcc00'); px(6,6,5,3,'#000000'); px(4,5,8,2,'#994400');
    px(4,  13,14,2,'#1a3a10'); px(5,11,4,4,'#e8dfc0');

  } else { // right
    const ls=frame%4>=2;
    px(15,30,10,ls?12:10,'#2a5020'); px(5,30,10,ls?10:12,'#2a5020');
    px(14,40,12,4,'#1a3a10');
    px(4, 14,24,18,'#4a7838'); px(6,15,20,14,'#5a8a46'); px(8,16,16,10,'#6a9a56');
    px(4, 31,24,3,'#7a5020');
    // Far arm (left)
    px(-2,14,6,16,'#3a6828');
    // Near arm + club (right side)
    px(26,14, 8,16,'#3a6828'); px(27,15,6,12,'#4a7838');
    px(32, 6,10,22,'#6a3a18'); px(33,7,8,18,'#8a5a2a');
    px(30, 4,14,8,'#7a4a20'); px(31,2,14,6,'#9a6232'); px(36,2,5,2,'#c8883a');
    // Head (right profile)
    px(6,  2,20,14,'#4a7838'); px(8,3,16,10,'#5a8a46');
    px(21,-6, 7,8,'#887040'); px(22,-8,5,5,'#aa9050'); px(23,-9,3,3,'#ccaa60');
    // Eye (right)
    px(18, 5, 8,5,'#ffcc00'); px(19,6,5,3,'#000000'); px(18,5,8,2,'#994400');
    px(12, 13,14,2,'#1a3a10'); px(21,11,4,4,'#e8dfc0');
  }

  // ── HP bar (shown only when damaged) ────────────────────────────────────
  if (hp < TROLL_HP && alpha > 0.5) {
    const bw=10, bh=5, gap=3, total=(TROLL_HP*(bw+gap))-gap;
    const bx = 15 - total/2, by = -14 + bob;
    for (let i=0; i<TROLL_HP; i++) {
      ctx.fillStyle = '#221100';
      ctx.fillRect(bx+i*(bw+gap)-1, by-1, bw+2, bh+2);
      ctx.fillStyle = i<hp ? '#44dd22' : '#551111';
      ctx.fillRect(bx+i*(bw+gap), by, bw, bh);
    }
  }

  ctx.restore();
}

// ─── Coin sprite ──────────────────────────────────────────────────────────────
function drawCoin(sx, sy, bobY) {
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(sx,sy+8+bobY,5,2,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#c8900a'; ctx.beginPath(); ctx.arc(sx,sy+bobY,7,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#f0b800'; ctx.beginPath(); ctx.arc(sx,sy+bobY,5.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ffe066'; ctx.beginPath(); ctx.arc(sx-1.5,sy-2+bobY,3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ffffff'; ctx.fillRect(sx-2,sy-3+bobY,2,2);
  ctx.restore();
}

// ─── Heart drawing ────────────────────────────────────────────────────────────
function drawHeart(x, y, full) {
  ctx.fillStyle = full?'#ff3333':'#442222';
  ctx.fillRect(x+1,y,2,2); ctx.fillRect(x+5,y,2,2);
  ctx.fillRect(x,y+2,8,3); ctx.fillRect(x+1,y+5,6,2); ctx.fillRect(x+2,y+7,4,2); ctx.fillRect(x+3,y+9,2,2);
  if (full) { ctx.fillStyle='#ff7777'; ctx.fillRect(x+1,y+1,2,1); ctx.fillRect(x+5,y+1,1,1); }
}

// ─── Cave tile rendering ──────────────────────────────────────────────────────
function buildCaveTile(id, phase) {
  const key=`ct_${id}_${phase}`;
  if (caveTileCache[key]) return caveTileCache[key];
  const oc=document.createElement('canvas'); oc.width=oc.height=TS;
  const c=oc.getContext('2d');
  if (id===C_FLOOR) {
    c.fillStyle='#1a1a24'; c.fillRect(0,0,TS,TS);
    c.fillStyle='#222232';
    [[2,4,4,2],[14,18,4,2],[24,8,3,2],[6,26,4,2],[28,14,3,2]].forEach(([x,y,w,h])=>c.fillRect(x,y,w,h));
    c.fillStyle='#2a2a3e'; [[8,12],[22,6],[4,22]].forEach(([x,y])=>c.fillRect(x,y,2,2));
  } else if (id===C_WALL) {
    c.fillStyle='#221e2e'; c.fillRect(0,0,TS,TS);
    c.fillStyle='#352a44';
    for (let row=0;row<4;row++){const off=row%2===0?0:7;for(let col=-off;col<TS;col+=14)c.fillRect(col,row*8,11,6);}
    c.fillStyle='#181220'; c.fillRect(0,0,TS,2); c.fillRect(0,0,2,TS);
    c.fillStyle='#4a3a5c'; c.fillRect(4,6,8,4); c.fillRect(16,14,10,4);
    c.fillStyle='#201828'; c.fillRect(22,2,6,4);
  } else if (id===C_LAVA) {
    const lc=phase%2===0
      ?['#cc2200','#ee4400','#ff7700','#ffaa00']
      :['#dd3300','#ff5500','#ff8800','#ffbb00'];
    c.fillStyle=lc[0]; c.fillRect(0,0,TS,TS);
    c.fillStyle=lc[1]; for(let y=2;y<TS;y+=8)c.fillRect(0,y,TS,5);
    c.fillStyle=lc[2]; c.fillRect(4,4,10,6); c.fillRect(18,10,8,5); c.fillRect(6,20,12,4);
    c.fillStyle=lc[3]; c.fillRect(6,5,5,3); c.fillRect(20,11,4,2); c.fillRect(9,21,6,2);
    c.fillStyle='rgba(255,240,200,0.5)'; c.fillRect(7,5,2,2); c.fillRect(21,12,2,1);
  }
  caveTileCache[key]=oc; return oc;
}
function getCaveTile(id) {
  const phase=Math.floor(caveAnimTick/500)%2;
  return buildCaveTile(id, id===C_LAVA?phase:0);
}

// ─── Cave entrance sprite (world map) ────────────────────────────────────────
function drawCaveEntrance(sx, sy) {
  ctx.save();
  // Left rock pillar
  ctx.fillStyle='#50505e'; ctx.fillRect(sx,    sy, 32, 56);
  ctx.fillStyle='#686878'; ctx.fillRect(sx,    sy, 32,  5);
  ctx.fillStyle='#38384a'; ctx.fillRect(sx+28, sy,  4, 56);
  // Right rock pillar
  ctx.fillStyle='#50505e'; ctx.fillRect(sx+64, sy, 32, 56);
  ctx.fillStyle='#686878'; ctx.fillRect(sx+64, sy, 32,  5);
  ctx.fillStyle='#38384a'; ctx.fillRect(sx+64, sy,  4, 56);
  // Top arch
  ctx.fillStyle='#484858'; ctx.fillRect(sx, sy,     96, 22);
  ctx.fillStyle='#686878'; ctx.fillRect(sx, sy,     96,  5);
  ctx.fillStyle='#38384a'; ctx.fillRect(sx, sy+18,  96,  4);
  // Dark glowing interior
  const grd=ctx.createRadialGradient(sx+48,sy+50,4,sx+48,sy+50,44);
  grd.addColorStop(0,'rgba(220,80,0,0.38)'); grd.addColorStop(0.45,'rgba(60,10,0,0.7)'); grd.addColorStop(1,'rgba(0,0,0,0.95)');
  ctx.fillStyle=grd; ctx.fillRect(sx+32,sy+18,32,40);
  // Torches
  [[sx+8,sy+28],[sx+80,sy+28]].forEach(([tx_,ty_])=>{
    ctx.fillStyle='#8a5028'; ctx.fillRect(tx_,ty_,4,10);
    const gf=ctx.createRadialGradient(tx_+2,ty_-2,1,tx_+2,ty_-2,7);
    gf.addColorStop(0,'rgba(255,220,100,0.9)'); gf.addColorStop(1,'rgba(255,80,0,0)');
    ctx.fillStyle=gf; ctx.beginPath(); ctx.arc(tx_+2,ty_-2,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffee80'; ctx.beginPath(); ctx.arc(tx_+2,ty_-2,3,0,Math.PI*2); ctx.fill();
  });
  // Rock texture
  ctx.fillStyle='#38384a';
  [[2,8],[10,16],[4,34],[20,8],[28,20],[66,10],[74,18],[68,30],[84,8],[90,22]].forEach(([rx,ry])=>ctx.fillRect(sx+rx,sy+ry,4,3));
  // Label
  ctx.fillStyle='rgba(0,0,0,0.55)'; roundRect(ctx,sx+14,sy+60,68,18,4); ctx.fill();
  ctx.fillStyle='#e8d5a3'; ctx.font='10px "Courier New"'; ctx.textAlign='center';
  ctx.fillText('Caverna',sx+48,sy+72); ctx.textAlign='left';
  ctx.restore();
}

// ─── Dragon sprite ────────────────────────────────────────────────────────────
function drawDragon(ox, oy, dir, frame, alpha, flash, hp) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(Math.round(ox), Math.round(oy));
  const bob = frame%2===1 ? 1 : 0;
  const fl  = flash > 0;
  const p   = (x,y,w,h,c) => { ctx.fillStyle=fl?'#ff5555':c; ctx.fillRect(x,y+bob,w,h); };

  // Drop shadow
  ctx.fillStyle=`rgba(0,0,0,${alpha*0.3})`;
  ctx.beginPath(); ctx.ellipse(30,62,26,7,0,0,Math.PI*2); ctx.fill();

  if (dir==='right') { ctx.save(); ctx.translate(60,0); ctx.scale(-1,1); }

  if (dir==='left'||dir==='right') {
    // Tail
    p(44,22,14,10,'#6a0808'); p(52,20, 9,6,'#7a1010'); p(57,16, 5,4,'#5a0606'); p(60,12, 3,6,'#480606');
    // Lower wing
    p( 8,42,40,12,'#550808'); p(10,44,36,10,'#6a0c0c');
    p(14,42, 2,12,'#380404'); p(24,42, 2,12,'#380404'); p(34,42, 2,12,'#380404');
    // Upper wing
    p(10, 2,38,14,'#5a0808'); p(12, 4,34,12,'#780e0e'); p(14, 6,30,10,'#6a0c0c');
    p(14, 4, 2,12,'#380404'); p(24, 4, 2,12,'#380404'); p(34, 4, 2,12,'#380404');
    p(10, 0, 4, 4,'#880e0e'); p(22, 0, 4, 4,'#880e0e'); p(34, 0, 4, 4,'#880e0e');
    // Body
    p( 6,14,50,26,'#7a1010'); p( 8,16,48,22,'#9a1818'); p(10,18,44,18,'#b02020');
    p(12,18, 8, 5,'#8a1414'); p(22,20, 8, 5,'#8a1414'); p(32,18, 8, 5,'#8a1414'); p(42,20, 8, 5,'#8a1414');
    p(16,26, 8, 5,'#8a1414'); p(28,24, 8, 5,'#8a1414'); p(38,26, 8, 5,'#8a1414');
    // Legs & claws
    p(16,36, 8,14,'#7a0e0e'); p(14,48,12, 6,'#5a0808');
    p(32,34, 8,14,'#7a0e0e'); p(30,46,12, 6,'#5a0808');
    p(14,52, 3, 5,'#c8a070'); p(18,52, 3, 5,'#c8a070'); p(22,52, 3, 5,'#c8a070');
    p(30,50, 3, 5,'#c8a070'); p(34,50, 3, 5,'#c8a070'); p(38,50, 3, 5,'#c8a070');
    // Neck + head
    p( 2,18,10,18,'#8a1010'); p( 4,20, 8,16,'#a01818');
    p( 0,12,14,24,'#8a1010'); p( 0,14,14,20,'#aa2020'); p( 0,20,14,14,'#c02828');
    p( 6,10, 4, 8,'#4a0808'); p( 9, 8, 3, 6,'#3a0606'); p( 2,12, 4, 6,'#4a0808');
    p( 2,14, 7, 6,'#ffcc00'); p( 3,15, 5, 4,'#000000'); p( 2,14, 2, 2,'#ffffaa');
    p( 0,22, 3, 2,'#180000');
    p( 0,24, 2, 5,'#e8d8b0'); p( 3,24, 2, 4,'#e8d8b0'); p( 6,24, 2, 5,'#e8d8b0'); p( 9,24, 2, 4,'#e8d8b0');
    // Fire-glow at mouth when ready to breathe
    if (dragon && dragon.fireBreathCooldown < 500 && dragon.state==='chase') {
      ctx.save(); ctx.globalAlpha=(1-dragon.fireBreathCooldown/500)*0.65;
      const gf=ctx.createRadialGradient(0,28,2,0,28,14);
      gf.addColorStop(0,'rgba(255,200,0,1)'); gf.addColorStop(1,'rgba(255,50,0,0)');
      ctx.fillStyle=gf; ctx.beginPath(); ctx.arc(0,28,14,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  } else if (dir==='down') {
    // Wings spread wide
    p(-10, 6,24,36,'#550808'); p(-6, 4,18,34,'#780e0e');
    p( 56, 6,24,36,'#550808'); p(58, 4,18,34,'#780e0e');
    p(-10,10, 2,24,'#340404'); p(-10,20, 2,16,'#340404');
    p( 68,10, 2,24,'#340404'); p( 68,20, 2,16,'#340404');
    // Tail top
    p(24,-6,12, 8,'#7a1010'); p(26,-10, 8, 6,'#6a0808'); p(28,-14, 4, 6,'#560606');
    // Body
    p(10, 2,40,44,'#7a1010'); p(12, 4,36,40,'#9a1818'); p(14, 6,32,36,'#b02020');
    p(16, 8, 8, 5,'#8a1414'); p(26, 8, 8, 5,'#8a1414'); p(36, 8, 8, 5,'#8a1414');
    p(20,16, 8, 5,'#8a1414'); p(30,16, 8, 5,'#8a1414');
    p(16,24, 8, 5,'#8a1414'); p(28,24, 8, 5,'#8a1414'); p(38,24, 8, 5,'#8a1414');
    // Arms + claws
    p( 6,14, 8,22,'#7a0e0e'); p(46,14, 8,22,'#7a0e0e');
    p( 4,30,12, 8,'#5a0808'); p(44,30,12, 8,'#5a0808');
    p( 4,36, 3, 6,'#c8a070'); p( 8,36, 3, 6,'#c8a070'); p(12,36, 3, 6,'#c8a070');
    p(44,36, 3, 6,'#c8a070'); p(48,36, 3, 6,'#c8a070'); p(52,36, 3, 6,'#c8a070');
    // Neck + head
    p(18,38,24, 8,'#8a1010');
    p(14,44,32,16,'#8a1010'); p(16,46,28,14,'#aa2020'); p(14,52,32, 8,'#c02828');
    p(14,42, 4, 8,'#4a0808'); p(16,40, 3, 4,'#3a0606');
    p(42,42, 4, 8,'#4a0808'); p(41,40, 3, 4,'#3a0606');
    p(16,46, 8, 6,'#ffcc00'); p(36,46, 8, 6,'#ffcc00');
    p(18,47, 5, 4,'#000000'); p(38,47, 5, 4,'#000000');
    p(16,46, 3, 2,'#ffffaa'); p(36,46, 3, 2,'#ffffaa');
    p(20,54, 3, 2,'#180000'); p(37,54, 3, 2,'#180000');
    p(16,58, 3, 6,'#e8d8b0'); p(20,58, 3, 6,'#e8d8b0'); p(24,58, 3, 6,'#e8d8b0');
    p(28,58, 3, 6,'#e8d8b0'); p(32,58, 3, 6,'#e8d8b0'); p(36,58, 3, 6,'#e8d8b0');
  } else {
    // 'up' — back of dragon
    p(24,-6,12, 8,'#7a1010'); p(26,-10, 8, 6,'#6a0808');
    p(-10, 6,24,38,'#550808'); p(-6, 4,18,36,'#780e0e');
    p( 56, 6,24,38,'#550808'); p(58, 4,18,36,'#780e0e');
    p(10, 2,40,44,'#7a1010'); p(12, 4,36,40,'#9a1818'); p(14, 6,32,36,'#b02020');
    p(14, 4, 4, 8,'#4a0808'); p(42, 4, 4, 8,'#4a0808');
  }

  if (dir==='right') ctx.restore();

  // Floating HP bar
  if (dragon && dragon.hp < DRAGON_HP_MAX && dragon.alive) {
    const bw=60, bh=5, bx=0, by=-18;
    ctx.fillStyle='#220000'; ctx.fillRect(bx,by-bob,bw,bh);
    const pct=dragon.hp/DRAGON_HP_MAX;
    ctx.fillStyle=pct>0.5?'#cc2222':pct>0.25?'#ee6622':'#ff8800';
    ctx.fillRect(bx,by-bob,bw*pct,bh);
    ctx.fillStyle='rgba(255,80,80,0.4)'; ctx.fillRect(bx,by-bob,bw*pct,2);
  }
  ctx.restore();
}

function drawFireball(sx, sy) {
  ctx.save();
  const grd=ctx.createRadialGradient(sx,sy,1,sx,sy,12);
  grd.addColorStop(0,'rgba(255,240,100,1)');
  grd.addColorStop(0.3,'rgba(255,120,0,0.9)');
  grd.addColorStop(1,'rgba(255,30,0,0)');
  ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(sx,sy,12,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff8e0'; ctx.beginPath(); ctx.arc(sx,sy,3,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// ─── Cave scene render ────────────────────────────────────────────────────────
function renderCave() {
  ctx.fillStyle='#0a0810'; ctx.fillRect(0,0,canvas.width,canvas.height);

  // Tiles
  for (let ty=0;ty<CAVE_H;ty++)
    for (let tx=0;tx<CAVE_W;tx++)
      ctx.drawImage(getCaveTile(caveMap[ty][tx]), tx*TS, ty*TS);

  // Vignette
  const vg=ctx.createRadialGradient(canvas.width/2,272,80,canvas.width/2,272,480);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.6)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,canvas.width,canvas.height);

  // Exit indicator
  ctx.save(); ctx.fillStyle='rgba(255,200,100,0.45)'; ctx.fillRect(11*TS,15*TS,2*TS,TS);
  ctx.fillStyle='#ffcc66'; ctx.font='9px "Courier New"'; ctx.textAlign='center';
  ctx.fillText('USCITA',11*TS+TS,15*TS+20); ctx.textAlign='left'; ctx.restore();

  // Coins
  for (const c of coins) { const bob=Math.sin(c.age+c.bobOffset)*2; drawCoin(c.x-4,c.y-4,bob); }

  // Y-sorted cave entities
  const cEnts=[];
  if (dragon) {
    if (dragon.dying)      cEnts.push({sortY:dragon.y+56,type:'dragon',alpha:Math.max(0,dragon.deathTimer/2500)});
    else if (dragon.alive) cEnts.push({sortY:dragon.y+56,type:'dragon',alpha:1});
  }
  for (const fb of fireballs) cEnts.push({sortY:fb.y,type:'fireball',fb});
  cEnts.push({sortY:player.y+player.h,type:'player'});
  cEnts.sort((a,b)=>a.sortY-b.sortY);

  const showPlayer=player.invincible<=0||Math.floor(player.invincible/90)%2===0;
  for (const e of cEnts) {
    if (e.type==='dragon') {
      drawDragon(dragon.x,dragon.y,dragon.dir,dragon.animFrame,e.alpha,dragon.hitFlash,dragon.hp);
    } else if (e.type==='fireball') {
      drawFireball(e.fb.x,e.fb.y);
    } else if (showPlayer) {
      drawKnight(player.x-2,player.y-6,player.dir,player.animFrame,player.moving,
        player.attacking,player.attacking?player.attackTimer/ATTACK_DURATION:0);
    }
  }

  // Arrows (cave – no cam offset)
  for (const a of arrows) drawArrow(a.x, a.y, a.dir);

  // Particles
  for (const p of particles) {
    ctx.save(); ctx.globalAlpha=p.life; ctx.fillStyle=p.color;
    ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size); ctx.restore();
  }
  // Floating texts
  for (const ft of floatingTexts) {
    ctx.save(); ctx.globalAlpha=Math.max(0,ft.life); ctx.fillStyle='#ff6666';
    ctx.font='bold 15px "Courier New"'; ctx.textAlign='center';
    ctx.shadowColor='#000'; ctx.shadowBlur=4;
    ctx.fillText(ft.text,ft.x,ft.y); ctx.textAlign='left'; ctx.shadowBlur=0; ctx.restore();
  }

  // Dragon HP bar at bottom
  if (dragon&&(dragon.alive||dragon.dying)) {
    const bw=220,bh=14,bx=canvas.width/2-110,by=canvas.height-26;
    ctx.fillStyle='rgba(0,0,0,0.72)'; roundRect(ctx,bx-6,by-6,bw+12,bh+12,6); ctx.fill();
    ctx.fillStyle='#330000'; ctx.fillRect(bx,by,bw,bh);
    const pct=Math.max(0,dragon.hp/DRAGON_HP_MAX);
    const hpG=ctx.createLinearGradient(bx,by,bx+bw,by);
    hpG.addColorStop(0,'#aa1a1a'); hpG.addColorStop(1,'#ff4444');
    ctx.fillStyle=hpG; ctx.fillRect(bx,by,bw*pct,bh);
    ctx.fillStyle='rgba(255,100,100,0.35)'; ctx.fillRect(bx,by,bw*pct,4);
    ctx.fillStyle='#e8d5a3'; ctx.font='bold 12px "Courier New"'; ctx.textAlign='center';
    ctx.fillText(`\u2604 DRAGO   ${dragon.hp} / ${DRAGON_HP_MAX}`,canvas.width/2,by-6);
    ctx.textAlign='left';
  }
  if (dragonDefeated&&(!dragon||!dragon.alive)&&!dragon?.dying) {
    ctx.fillStyle='rgba(0,0,0,0.55)'; roundRect(ctx,canvas.width/2-160,canvas.height/2-28,320,56,10); ctx.fill();
    ctx.fillStyle='#ffcc44'; ctx.font='bold 14px "Courier New"'; ctx.textAlign='center';
    ctx.fillText('Drago sconfitto! Vai a sud per uscire.',canvas.width/2,canvas.height/2+6);
    ctx.textAlign='left';
  }

  drawHUD();
  if (gameState==='dead') drawDeathScreen();
}

// ─── House / Campfire / Well sprites ─────────────────────────────────────────
function buildHouseCanvas(variant) {
  if (houseCanvases[variant]) return houseCanvases[variant];
  const W = 64, H = HOUSE_ROOF_OVERHANG + 2*TS; // 14 + 64 = 78
  const oc = document.createElement('canvas'); oc.width=W; oc.height=H;
  const c  = oc.getContext('2d');

  const schemes = [
    // 0 – red/terracotta roof, sandy walls
    { rTop:'#6a1212', rMid:'#9a2222', rShin:'#7a1a1a', eave:'#c07848',
      wMain:'#d4b880', wLight:'#e8cc96', wShadow:'#b89860',
      door:'#7a4820', doorDk:'#4a2808', win:'#3a506a' },
    // 1 – dark slate roof, off-white walls
    { rTop:'#182434', rMid:'#263c56', rShin:'#1c3048', eave:'#7080a0',
      wMain:'#ddd8cc', wLight:'#eee8da', wShadow:'#bdb8ac',
      door:'#5a3820', doorDk:'#3a2010', win:'#334466' },
    // 2 – green moss roof, warm timber walls
    { rTop:'#1a3018', rMid:'#2a4a28', rShin:'#1e3a1e', eave:'#608050',
      wMain:'#a87848', wLight:'#c89060', wShadow:'#886030',
      door:'#4a2810', doorDk:'#2a1808', win:'#3a2818' },
  ];
  const s = schemes[variant % 3];

  const wallY = HOUSE_ROOF_OVERHANG + 34; // 48 – where walls start in canvas coords

  // Drop shadow
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(4, H-2, W-4, 5);

  // === WALLS ===
  c.fillStyle = s.wShadow;  c.fillRect(0, wallY, W, H-wallY);
  c.fillStyle = s.wMain;    c.fillRect(2, wallY+2, W-4, H-wallY-2);
  c.fillStyle = s.wLight;   c.fillRect(2, wallY+2, W-4, 4);
  // Horizontal stone/plank lines
  c.fillStyle = 'rgba(0,0,0,0.07)';
  for (let ly = wallY+9; ly < H-2; ly += 8) c.fillRect(2, ly, W-4, 1);

  // Door
  c.fillStyle = s.doorDk; c.fillRect(26, wallY+10, 12, H-wallY-10);
  c.fillStyle = s.door;   c.fillRect(27, wallY+11, 10, H-wallY-11);
  c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(28, wallY+13, 4, 8); c.fillRect(33, wallY+13, 4, 8);
  c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(28, wallY+12, 2, 5);
  c.fillStyle = '#ffcc44'; c.fillRect(35, wallY+22, 2, 2); // doorknob
  // Door arch
  c.fillStyle = s.wShadow; c.fillRect(24, wallY+8, 16, 5);
  c.fillStyle = s.wMain;   c.fillRect(25, wallY+9, 14, 4);

  // Windows
  [[5, wallY+5], [43, wallY+5]].forEach(([wx, wy]) => {
    c.fillStyle = s.win; c.fillRect(wx, wy, 14, 14);
    [[wx+1,wy+1,6,6,'#aaddff'],[wx+7,wy+1,6,6,'#88ccee'],
     [wx+1,wy+7,6,6,'#99ddff'],[wx+7,wy+7,6,6,'#77bbdd']].forEach(([px,py,pw,ph,col])=>{
       c.fillStyle=col; c.fillRect(px,py,pw,ph);
    });
    c.fillStyle = s.win; c.fillRect(wx, wy+6, 14, 2); c.fillRect(wx+6, wy, 2, 14);
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(wx+1, wy+1, 3, 2);
  });

  // === ROOF ===
  const eaveY = HOUSE_ROOF_OVERHANG + 30; // 44
  c.fillStyle = s.rMid;  c.fillRect(-2, HOUSE_ROOF_OVERHANG, W+4, eaveY-HOUSE_ROOF_OVERHANG);
  c.fillStyle = s.rTop;  c.fillRect(-2, 0, W+4, HOUSE_ROOF_OVERHANG+2);
  // Shingles
  c.fillStyle = s.rShin;
  for (let ry = HOUSE_ROOF_OVERHANG+2; ry < eaveY-2; ry += 8)
    for (let rx = -2; rx < W+2; rx += 14) c.fillRect(rx+1, ry, 10, 6);
  // Ridge (east-west peak, top-down view)
  c.fillStyle = s.rTop; c.fillRect(28, 0, 8, eaveY);
  c.fillStyle = 'rgba(0,0,0,0.22)';      c.fillRect(28, 0, 3, eaveY);
  c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(33, 0, 3, eaveY);
  // Top cap
  c.fillStyle = s.rTop; c.fillRect(-2, 0, W+4, 5);
  // Eave
  c.fillStyle = s.eave; c.fillRect(-4, eaveY-2, W+8, 8);
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-4, eaveY+4, W+8, 3);

  // Chimney (variants 0 and 2)
  if (variant !== 1) {
    const cx = variant === 0 ? 47 : 8;
    c.fillStyle = '#888'; c.fillRect(cx,   -10, 8, 20);
    c.fillStyle = '#aaa'; c.fillRect(cx,   -10, 8,  4);
    c.fillStyle = '#555'; c.fillRect(cx-2,  -6, 12, 4);
    c.fillStyle = 'rgba(200,200,200,0.25)'; c.fillRect(cx+1, -14, 4, 6);
  }

  houseCanvases[variant] = oc;
  return oc;
}

function buildCampfireFrames() {
  if (campfireFrames.length > 0) return;
  for (let f = 0; f < 4; f++) {
    const oc = document.createElement('canvas'); oc.width=28; oc.height=32;
    const c  = oc.getContext('2d');

    // Glow
    const grd = c.createRadialGradient(14, 24, 2, 14, 24, 14);
    grd.addColorStop(0, 'rgba(255,140,0,0.42)');
    grd.addColorStop(1, 'rgba(255,60,0,0)');
    c.fillStyle = grd; c.fillRect(0, 10, 28, 22);

    // Logs
    c.fillStyle = '#8a5a28'; c.fillRect(5, 22, 18, 4);
    c.fillRect(9, 15, 4, 11); c.fillRect(15, 15, 4, 11);
    c.fillStyle = '#6a4018'; c.fillRect(6, 23, 16, 2); c.fillRect(10, 16, 2, 8);

    // Embers
    c.fillStyle = '#ff3300'; c.fillRect(10, 20, 8, 5);
    c.fillStyle = '#ff8800'; c.fillRect(12, 21, 4, 3);

    // Stones
    [[2,26,6,4],[20,26,6,4],[1,20,5,8],[22,20,5,8],[6,28,16,3]].forEach(([x,y,w,h]) => {
      c.fillStyle = '#6a6a6a'; c.fillRect(x,y,w,h);
      c.fillStyle = '#8a8a8a'; c.fillRect(x,y,w,1);
    });

    // Animated fire
    const fh = [10, 14, 8, 12][f];
    const sw = [-1,  1,-2,  0][f];
    c.fillStyle = '#ff5500'; c.fillRect(9+sw,  20-fh,    10, fh);
    c.fillStyle = '#ffaa00'; c.fillRect(11+sw, 20-fh+2,   6, fh-2);
    c.fillStyle = '#ffee44'; c.fillRect(12+sw, 20-fh+4,   4, Math.max(1,fh-6));
    c.fillStyle = '#fffff0'; c.fillRect(13,    20-fh+6,   2,  2);

    campfireFrames[f] = oc;
  }
}

function drawCampfire(sx, sy, animFrame, restTimer) {
  if (campfireFrames.length === 0) buildCampfireFrames();
  ctx.drawImage(campfireFrames[animFrame], sx - 14, sy - 22);

  if (restTimer > 0 && restTimer < CAMPFIRE_HEAL_TIME) {
    const pct = restTimer / CAMPFIRE_HEAL_TIME;
    ctx.save();
    ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy - 30, 10, -Math.PI*0.5, -Math.PI*0.5 + Math.PI*2*pct);
    ctx.stroke();
    ctx.restore();
  }
}

function drawWell(sx, sy) {
  ctx.save();
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(sx, sy+16, 10, 4, 0, 0, Math.PI*2); ctx.fill();

  // Stone base
  ctx.fillStyle = '#6a6a7a'; ctx.fillRect(sx-11, sy-2, 22, 16);
  ctx.fillStyle = '#8a8a9a'; ctx.fillRect(sx-9,  sy-4, 18, 16);
  ctx.fillStyle = '#9a9aaa'; ctx.fillRect(sx-9,  sy-4, 18,  4);

  // Water
  ctx.fillStyle = '#1f5a99'; ctx.fillRect(sx-7, sy-2, 14, 10);
  ctx.fillStyle = '#3388cc'; ctx.fillRect(sx-7, sy-2, 14,  4);
  ctx.fillStyle = '#66aaee'; ctx.fillRect(sx-5, sy-1,  5,  2);

  // Posts
  ctx.fillStyle = '#7a5028'; ctx.fillRect(sx-13, sy-18, 5, 24);
  ctx.fillStyle = '#7a5028'; ctx.fillRect(sx+8,  sy-18, 5, 24);
  ctx.fillStyle = '#5a3818'; ctx.fillRect(sx-12, sy-18, 2, 24);
  ctx.fillStyle = '#5a3818'; ctx.fillRect(sx+8,  sy-18, 2, 24);

  // Crossbeam
  ctx.fillStyle = '#6a4018'; ctx.fillRect(sx-13, sy-18, 26, 5);
  ctx.fillStyle = '#8a5828'; ctx.fillRect(sx-12, sy-17, 24,  3);

  // Rope + bucket
  ctx.fillStyle = '#ccaa44'; ctx.fillRect(sx-1, sy-13,  2, 12);
  ctx.fillStyle = '#8a5028'; ctx.fillRect(sx-4, sy-3,   8,  7);
  ctx.fillStyle = '#6a3a18'; ctx.fillRect(sx-4, sy-5,   8,  3);
  ctx.fillStyle = '#aa6a30'; ctx.fillRect(sx-3, sy-3,   8,  2);

  ctx.restore();
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  if (gameScene === 'cave') {
    renderCave();
    if (transitionAlpha>0){ctx.fillStyle=`rgba(0,0,0,${transitionAlpha})`;ctx.fillRect(0,0,canvas.width,canvas.height);}
    return;
  }
  ctx.fillStyle='#1a3a0a'; ctx.fillRect(0,0,canvas.width,canvas.height);

  const startX=Math.max(0,Math.floor(cam.x/TS)), startY=Math.max(0,Math.floor(cam.y/TS));
  const endX=Math.min(MAP_W,Math.ceil((cam.x+canvas.width)/TS));
  const endY=Math.min(MAP_H,Math.ceil((cam.y+canvas.height)/TS));

  for (let ty=startY;ty<endY;ty++)
    for (let tx=startX;tx<endX;tx++)
      ctx.drawImage(getTile(map[ty][tx]),tx*TS-cam.x,ty*TS-cam.y);

  // Coins below entities
  for (const c of coins) {
    const bob=Math.sin(c.age+c.bobOffset)*2;
    drawCoin(c.x-cam.x, c.y-cam.y-4, bob);
  }

  // Y-sorted entities (houses, well, campfires, enemies, player)
  const entities=[];
  for (const h of houseData)
    entities.push({ sortY: h.y + 2*TS, type: 'house', h });
  for (const w of wellData)
    entities.push({ sortY: w.y + 20,   type: 'well',  w });
  for (const cf of campfires)
    entities.push({ sortY: cf.y + 12,  type: 'campfire', cf });
  entities.push({ sortY: CAVE_ENT_TY*TS, type: 'cave_entrance' });
  for (const g of goblins) {
    if (g.dying)       entities.push({sortY:g.y,type:'goblin',g,alpha:Math.max(0,g.deathTimer/DEATH_DUR),flash:g.hitFlash});
    else if (g.alive)  entities.push({sortY:g.y,type:'goblin',g,alpha:1,flash:g.hitFlash});
  }
  for (const t of trolls) {
    if (t.dying)       entities.push({sortY:t.y,type:'troll',t,alpha:Math.max(0,t.deathTimer/(DEATH_DUR*1.5)),flash:t.hitFlash});
    else if (t.alive)  entities.push({sortY:t.y,type:'troll',t,alpha:1,flash:t.hitFlash});
  }
  entities.push({sortY:player.y+player.h, type:'player'});
  entities.sort((a,b)=>a.sortY-b.sortY);

  const showPlayer = player.invincible<=0 || Math.floor(player.invincible/90)%2===0;

  for (const e of entities) {
    if (e.type==='cave_entrance') {
      drawCaveEntrance((CAVE_ENT_TX-1)*TS-cam.x, (CAVE_ENT_TY-1)*TS-cam.y);
    } else if (e.type==='house') {
      ctx.drawImage(buildHouseCanvas(e.h.variant), e.h.x-cam.x, e.h.y-cam.y-HOUSE_ROOF_OVERHANG);
      if (e.h.isShop) {
        // Cartello del negozio sull'eave della casa
        const sx = e.h.x - cam.x + 32, sy = e.h.y - cam.y + 30;
        ctx.save();
        ctx.fillStyle = '#7a4820'; ctx.fillRect(sx-22, sy, 44, 14);
        ctx.fillStyle = '#c89050'; ctx.fillRect(sx-21, sy+1, 42, 12);
        ctx.fillStyle = '#2a1408'; ctx.font = 'bold 8px "Courier New"'; ctx.textAlign = 'center';
        ctx.fillText('NEGOZIO', sx, sy + 10); ctx.textAlign = 'left';
        ctx.restore();
      }
    } else if (e.type==='well') {
      drawWell(e.w.x-cam.x, e.w.y-cam.y);
    } else if (e.type==='campfire') {
      drawCampfire(e.cf.x-cam.x, e.cf.y-cam.y, e.cf.animFrame, e.cf.restTimer);
    } else if (e.type==='goblin') {
      drawGoblin(e.g.x-cam.x-9, e.g.y-cam.y-14, e.g.dir, e.g.animFrame, e.alpha, e.flash);
    } else if (e.type==='troll') {
      drawTroll(e.t.x-cam.x-15, e.t.y-cam.y-26, e.t.dir, e.t.animFrame, e.alpha, e.flash, e.t.hp);
    } else if (showPlayer) {
      drawKnight(
        player.x-cam.x-2, player.y-cam.y-6,
        player.dir, player.animFrame, player.moving,
        player.attacking, player.attacking?player.attackTimer/ATTACK_DURATION:0
      );
    }
  }

  // Frecce
  for (const a of arrows) drawArrow(a.x - cam.x, a.y - cam.y, a.dir);

  // Floating texts (world-space)
  for (const ft of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.life);
    ctx.fillStyle   = '#ff6666';
    ctx.font        = 'bold 15px "Courier New"';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
    ctx.fillText(ft.text, ft.x - cam.x, ft.y - cam.y);
    ctx.textAlign = 'left'; ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Particles
  for (const p of particles) {
    ctx.save(); ctx.globalAlpha=p.life;
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x-cam.x-p.size/2, p.y-cam.y-p.size/2, p.size, p.size);
    ctx.restore();
  }

  // Prompt [E] vicino al negozio
  if (!shopOpen) {
    for (const h of houseData) {
      if (!h.isShop) continue;
      const doorX = h.x + TS, doorY = h.y + 2*TS;
      const px = player.x + player.w/2, py = player.y + player.h/2;
      if (Math.sqrt((px-doorX)**2 + (py-doorY)**2) < SHOP_INTERACT_DIST) {
        const sx = px - cam.x, sy = py - cam.y - 36;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; roundRect(ctx, sx-38, sy-14, 76, 18, 4); ctx.fill();
        ctx.fillStyle = '#ffe088'; ctx.font = 'bold 11px "Courier New"'; ctx.textAlign = 'center';
        ctx.fillText('[E] Negozio', sx, sy); ctx.textAlign = 'left';
        ctx.restore();
      }
    }
  }

  drawHUD();
  if (gameState==='dead') drawDeathScreen();
  drawShopUI();

  // Transition overlay (world scene)
  if (transitionAlpha>0){ctx.fillStyle=`rgba(0,0,0,${transitionAlpha})`;ctx.fillRect(0,0,canvas.width,canvas.height);}
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawHUD() {
  // Hearts
  ctx.fillStyle='rgba(0,0,0,0.5)';
  roundRect(ctx,10,10,94,30,6); ctx.fill();
  for (let i=0;i<player.maxHearts;i++) drawHeart(18+i*28,17,i<player.hearts);

  // Coins
  ctx.fillStyle='rgba(0,0,0,0.5)';
  roundRect(ctx,10,46,94,26,6); ctx.fill();
  drawCoin(24,59,0);
  ctx.fillStyle='#f0e060'; ctx.font='bold 13px "Courier New"';
  ctx.fillText(`x ${player.coins}`,36,64);

  // Kill counter
  ctx.fillStyle='rgba(0,0,0,0.5)';
  roundRect(ctx,canvas.width/2-80,10,160,30,6); ctx.fill();
  ctx.fillStyle='#ff6644'; ctx.font='bold 13px "Courier New"';
  ctx.textAlign='center';
  ctx.fillText(`\u2620 Uccisi: ${killCount}`,canvas.width/2,30);
  ctx.textAlign='left';

  // Controls
  // Arco nel HUD
  if (player.hasBow) {
    ctx.fillStyle='rgba(0,0,0,0.5)';
    roundRect(ctx,10,78,94,28,6); ctx.fill();
    ctx.fillStyle='#ffdd88'; ctx.font='14px "Courier New"';
    ctx.fillText('🏹 X: freccia',18,97);
  }

  ctx.fillStyle='rgba(0,0,0,0.5)';
  roundRect(ctx,10,canvas.height-52,260,42,6); ctx.fill();
  ctx.fillStyle='#e8d5a3'; ctx.font='12px "Courier New"';
  ctx.fillText('Move: Arrow Keys / WASD',20,canvas.height-32);
  ctx.fillText('Attack: Z/Space' + (player.hasBow ? '  ·  X: freccia' : ''),20,canvas.height-14);

  // Attack cooldown
  if (player.attackCooldown > 0) {
    const pct=1-player.attackCooldown/ATTACK_COOLDOWN;
    ctx.fillStyle='rgba(0,0,0,0.5)'; roundRect(ctx,10,canvas.height-58,82,5,2); ctx.fill();
    ctx.fillStyle='#ffcc44'; ctx.fillRect(10,canvas.height-58,82*pct,5);
  }

  // Mini-map
  const mmW=100,mmH=100,mmX=canvas.width-mmW-10,mmY=10;
  ctx.fillStyle='rgba(0,0,0,0.6)'; roundRect(ctx,mmX-2,mmY-2,mmW+4,mmH+4,4); ctx.fill();
  const scX=mmW/MAP_W, scY=mmH/MAP_H;
  for (let ty=0;ty<MAP_H;ty++) for (let tx=0;tx<MAP_W;tx++) {
    ctx.fillStyle=minimapColor(map[ty][tx]);
    ctx.fillRect(mmX+tx*scX,mmY+ty*scY,Math.max(1,scX),Math.max(1,scY));
  }
  for (const g of goblins) {
    if (!g.alive&&!g.dying) continue;
    ctx.fillStyle=g.dying?'rgba(200,50,50,0.5)':'#ff4422';
    ctx.fillRect(mmX+(g.x/TS)*scX-1,mmY+(g.y/TS)*scY-1,2.5,2.5);
  }
  for (const t of trolls) {
    if (!t.alive&&!t.dying) continue;
    ctx.fillStyle=t.dying?'rgba(100,180,80,0.5)':'#66cc44';
    ctx.fillRect(mmX+(t.x/TS)*scX-2,mmY+(t.y/TS)*scY-2,5,5); // bigger dot
  }
  for (const c of coins) {
    ctx.fillStyle='#f0b800'; ctx.fillRect(mmX+(c.x/TS)*scX-0.5,mmY+(c.y/TS)*scY-0.5,2,2);
  }
  ctx.strokeStyle='rgba(255,255,200,0.7)'; ctx.lineWidth=1;
  ctx.strokeRect(mmX+(cam.x/TS)*scX,mmY+(cam.y/TS)*scY,(canvas.width/TS)*scX,(canvas.height/TS)*scY);
  ctx.fillStyle='#ffdd44';
  ctx.fillRect(mmX+(player.x/TS)*scX-1.5,mmY+(player.y/TS)*scY-1.5,3,3);
}

// ─── Death screen ─────────────────────────────────────────────────────────────
function drawDeathScreen() {
  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.textAlign='center';
  ctx.fillStyle='#cc2222'; ctx.font='bold 48px "Courier New"';
  ctx.fillText('YOU DIED',canvas.width/2,canvas.height/2-30);
  ctx.fillStyle='#e8d5a3'; ctx.font='18px "Courier New"';
  ctx.fillText(`Uccisi: ${killCount}   Monete: ${player.coins}`,canvas.width/2,canvas.height/2+16);
  ctx.fillStyle='#aaaaaa'; ctx.font='14px "Courier New"';
  ctx.fillText('Premi Space / Enter per ricominciare',canvas.width/2,canvas.height/2+50);
  ctx.textAlign='left';
}

// ─── Restart ──────────────────────────────────────────────────────────────────
function restartGame() {
  Object.assign(player, {
    x:(MAP_W/2)*TS, y:(MAP_H/2)*TS,
    dir:'down', moving:false, animFrame:0, animTimer:0,
    attacking:false, attackTimer:0, attackCooldown:0, attackHit:new Set(),
    hearts:3, invincible:0, coins:0, hasBow:false,
  });
  killCount=0; coins.length=0; particles.length=0; floatingTexts.length=0;
  fireballs.length=0; arrows.length=0; dragonDefeated=false; dragon=null;
  shopOpen=false;
  gameScene='world'; transitionAlpha=0; transitionDir=0; sceneAfterFade=null;
  spawnGoblins(); spawnTrolls(); spawnCampfires();
  gameState='playing';
  GameAudio.fadeMusicIn();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function minimapColor(tile) {
  switch(tile){
    case T_GRASS:  return '#4a8a30'; case T_GRASS2: return '#3e7a24';
    case T_GRASS3: return '#507830'; case T_FLOWER: return '#88cc44';
    case T_TREE:   return '#1e4a10'; case T_ROCK:   return '#888888';
    case T_WATER:  return '#3366aa'; case T_SAND:   return '#c8a850';
    case T_PATH:   return '#9a7840'; case T_WALL:    return '#9a7840';
    default:        return '#000000';
  }
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

// ─── Game loop ────────────────────────────────────────────────────────────────
let lastTime=0;
function loop(ts){
  const dt=Math.min(ts-lastTime,50); lastTime=ts;
  update(dt); updateCamera(); render();
  requestAnimationFrame(loop);
}

generateMap();
placeVillage();
placeCaveEntrance();
spawnGoblins();
spawnTrolls();
spawnCampfires();
buildCampfireFrames();
requestAnimationFrame(loop);
