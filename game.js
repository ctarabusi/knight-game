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
const ATTACK_DURATION  = 380;
const ATTACK_COOLDOWN  = 480;
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

// Tile IDs
const T_GRASS  = 0, T_GRASS2 = 1, T_GRASS3 = 2, T_FLOWER = 3;
const T_TREE   = 4, T_ROCK   = 5, T_WATER  = 6, T_SAND   = 7, T_PATH = 8;

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
  return map[ty][tx] === T_TREE || map[ty][tx] === T_ROCK || map[ty][tx] === T_WATER;
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
  hearts: 3, maxHearts: 3, invincible: 0, coins: 0,
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
    tryAttack();
  }
  if (e.key === 'Enter' && gameState === 'dead') restartGame();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

function tryAttack() {
  if (!player.attacking && player.attackCooldown <= 0) {
    player.attacking = true; player.attackTimer = 0; player.attackHit = new Set();
    GameAudio.playSwordSwing();
  }
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
    } while ((isSolid(tx,ty)||(Math.abs(tx-cx)<10&&Math.abs(ty-cy)<10)) && att<200);
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
    } while ((isSolid(tx,ty)||(Math.abs(tx-cx)<18&&Math.abs(ty-cy)<18)) && att<300);
    trolls.push({
      x: tx*TS+TS/2, y: ty*TS+TS/2,
      dir: 'down', alive: true, dying: false, deathTimer: 0,
      hp: TROLL_HP, animFrame: 0, animTimer: 0, hitFlash: 0,
      wanderAngle: tr()*Math.PI*2, wanderTimer: 0,
      attackCooldown: 2000 + tr()*2000,
    });
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
  if (gameState === 'dead') return;
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

  updateGoblins(dt); updateTrolls(dt); updateCoins(dt); updateParticles(dt);
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

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
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

  // Y-sorted entities
  const entities=[];
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
    if (e.type==='goblin') {
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

  // Particles
  for (const p of particles) {
    ctx.save(); ctx.globalAlpha=p.life;
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x-cam.x-p.size/2, p.y-cam.y-p.size/2, p.size, p.size);
    ctx.restore();
  }

  drawHUD();
  if (gameState==='dead') drawDeathScreen();
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
  ctx.fillStyle='rgba(0,0,0,0.5)';
  roundRect(ctx,10,canvas.height-52,240,42,6); ctx.fill();
  ctx.fillStyle='#e8d5a3'; ctx.font='12px "Courier New"';
  ctx.fillText('Move: Arrow Keys / WASD',20,canvas.height-32);
  ctx.fillText('Attack: Z or Space',20,canvas.height-14);

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
    hearts:3, invincible:0, coins:0,
  });
  killCount=0; coins.length=0; particles.length=0;
  spawnGoblins(); spawnTrolls();
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
    case T_PATH:   return '#9a7840'; default:        return '#000000';
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
spawnGoblins();
spawnTrolls();
requestAnimationFrame(loop);
