/* Quiet Harbor sample scene
 * Harbor props by Lanternbay Studio
 * Layout and interaction written for this sample page.
 */

(function () {
  "use strict";

  const VIEW_W = 1600;
  const VIEW_H = 900;
  const WORLD_W = 2100;
  const WATERLINE = 500;

  const ASSETS = {
    lampPost: "assets/png/03-lamp-post.png",
    buoy: "assets/png/04-buoy.png",
    crate: "assets/png/05-crate.png",
    bollard: "assets/png/06-bollard.png",
    rope: "assets/png/07-coiled-rope.png",
    rowboat: "assets/png/08-rowboat.png",
    anchor: "assets/png/10-anchor.png",
    basket: "assets/png/11-fish-basket.png",
    lighthouse: "assets/png/13-lighthouse.png",
    seagull: "assets/png/14-seagull.png",
    wave: "assets/png/15-wave.png",
    piling: "assets/png/16-dock-piling.png",
    reflection: "assets/png/17-lantern-reflection.png",
    barrel: "assets/png/18-barrel.png",
    lifeRing: "assets/png/19-life-ring.png",
    bell: "assets/png/20-harbor-bell.png",
    signboard: "assets/png/21-signboard.png",
    fish: "assets/png/22-hanging-fish.png",
    gangplank: "assets/png/26-gangplank.png",
    starfish: "assets/png/29-starfish.png",
    lanternString: "assets/png/30-lantern-string.png",
    moon: "assets/png/31-moon-over-water.png",
    cleat: "assets/png/32-mooring-cleat.png",
  };

  const images = {};
  const keys = Object.create(null);

  const boat = {
    x: 980,
    y: 640,
    vx: 0,
    vy: 0,
  };

  const seagulls = [
    { x: 820, y: 150, speed: 18, phase: 0.2, size: 90 },
    { x: 1500, y: 210, speed: 12, phase: 1.4, size: 70 },
  ];

  const buoys = [
    { x: 1220, y: 620, phase: 0.0, size: 78 },
    { x: 1680, y: 700, phase: 1.7, size: 64 },
  ];

  let camX = 0;
  let startTime = 0;
  let canvas, ctx;

  function loadImages() {
    const entries = Object.entries(ASSETS);
    return Promise.all(
      entries.map(function (pair) {
        return new Promise(function (resolve, reject) {
          const img = new Image();
          img.onload = function () {
            images[pair[0]] = img;
            resolve();
          };
          img.onerror = function () {
            reject(new Error("Failed to load " + pair[1]));
          };
          img.src = pair[1];
        });
      })
    );
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  // Draw a sprite. anchor is "center" or "feet" (bottom-center).
  function drawSprite(img, x, y, width, anchor, alpha) {
    if (!img) return;
    const h = width * (img.height / img.width);
    const dx = x - width / 2;
    const dy = anchor === "feet" ? y - h : y - h / 2;
    if (alpha != null && alpha < 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, dx, dy, width, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, dx, dy, width, h);
    }
  }

  // The moon-over-water icon includes a reflection; crop to the moon disc only.
  // Crop bounds measured from the 512×512 PNG: disc occupies y≈83–268.
  function drawMoon(x, y, width) {
    const img = images.moon;
    if (!img) return;
    const sx = 160;
    const sy = 70;
    const sw = 192;
    const sh = 210;
    const height = width * (sh / sw);
    ctx.drawImage(img, sx, sy, sw, sh, x - width / 2, y - height / 2, width, height);
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, WATERLINE);
    g.addColorStop(0, "#1a1e36");
    g.addColorStop(0.45, "#2a2438");
    g.addColorStop(1, "#3a2a32");
    ctx.fillStyle = g;
    ctx.fillRect(camX, 0, VIEW_W, WATERLINE);

    // Soft horizon glow
    const glow = ctx.createLinearGradient(0, WATERLINE - 80, 0, WATERLINE);
    glow.addColorStop(0, "rgba(230, 162, 60, 0)");
    glow.addColorStop(1, "rgba(196, 107, 74, 0.18)");
    ctx.fillStyle = glow;
    ctx.fillRect(camX, WATERLINE - 80, VIEW_W, 80);
  }

  function drawWater(time) {
    const sea = ctx.createLinearGradient(0, WATERLINE, 0, VIEW_H);
    sea.addColorStop(0, "#243656");
    sea.addColorStop(0.45, "#1c2c44");
    sea.addColorStop(1, "#152033");
    ctx.fillStyle = sea;
    ctx.fillRect(camX, WATERLINE, VIEW_W, VIEW_H - WATERLINE);

    // Gentle shimmer bands
    ctx.save();
    ctx.globalAlpha = 0.08 + 0.03 * Math.sin(time * 0.8);
    ctx.fillStyle = "#2f6a6a";
    for (let i = 0; i < 5; i++) {
      const y = WATERLINE + 40 + i * 70 + Math.sin(time * 0.6 + i) * 6;
      ctx.fillRect(camX, y, VIEW_W, 10);
    }
    ctx.restore();
  }

  function drawWaves(time) {
    const img = images.wave;
    if (!img) return;
    const width = 220;
    const h = width * (img.height / img.width);
    const spacing = 200;
    const start = Math.floor(camX / spacing) * spacing - spacing;
    const end = camX + VIEW_W + spacing;

    for (let row = 0; row < 3; row++) {
      const y = 610 + row * 90;
      const phase = time * (0.4 + row * 0.15) + row * 1.2;
      ctx.globalAlpha = 0.55 - row * 0.1;
      for (let x = start; x < end; x += spacing) {
        const bob = Math.sin(phase + x * 0.01) * 8;
        const drift = Math.sin(phase * 0.5 + row) * 16;
        ctx.drawImage(img, x + drift, y + bob - h / 2, width, h);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawDock() {
    const dockLeft = 0;
    const dockRight = 1100;
    const dockTop = 448;
    const deckH = 58;
    const dockBottom = dockTop + deckH;

    // Deck top
    ctx.fillStyle = "#8b5e3c";
    ctx.fillRect(dockLeft, dockTop, dockRight - dockLeft, deckH);

    // Deck highlight stripe
    ctx.fillStyle = "#a06c45";
    ctx.fillRect(dockLeft, dockTop, dockRight - dockLeft, 14);

    // Front edge (darker fascia)
    ctx.fillStyle = "#6e492e";
    ctx.fillRect(dockLeft, dockBottom - 10, dockRight - dockLeft, 10);

    // Ink outline, matching the prop stroke weight
    ctx.strokeStyle = "#1e2a3a";
    ctx.lineWidth = 3;
    ctx.strokeRect(dockLeft - 1, dockTop, dockRight - dockLeft + 1, deckH);

    // Simple vertical pilings under the deck (drawn, then a few prop sprites)
    const postW = 22;
    const postGap = 52;
    for (let x = 28; x < dockRight - 10; x += postGap) {
      ctx.fillStyle = "#6e492e";
      ctx.fillRect(x, dockBottom, postW, 250);
      ctx.fillStyle = "#8b5e3c";
      ctx.fillRect(x + 4, dockBottom, 6, 250);
      ctx.strokeStyle = "#1e2a3a";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, dockBottom, postW, 250);
    }
  }

  function drawRock(cx, cy, w, h) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "#2a3344";
    ctx.strokeStyle = "#1e2a3a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w * 0.48, -h * 0.15);
    ctx.lineTo(-w * 0.22, -h * 0.5);
    ctx.lineTo(w * 0.2, -h * 0.48);
    ctx.lineTo(w * 0.5, -h * 0.1);
    ctx.lineTo(w * 0.42, h * 0.45);
    ctx.lineTo(-w * 0.4, h * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawProps(time) {
    const dockTop = 448;

    // Moon in the upper right of the opening view
    drawMoon(1480, 120, 130);

    // Seagulls
    seagulls.forEach(function (s) {
      const bob = Math.sin(time * 1.4 + s.phase) * 10;
      drawSprite(images.seagull, s.x, s.y + bob, s.size, "center");
    });

    // Lighthouse on a rock to the right of the dock
    drawRock(1460, WATERLINE + 36, 260, 130);
    drawSprite(images.lighthouse, 1460, WATERLINE + 8, 220, "feet");

    // Lantern string hanging over the dock
    drawSprite(images.lanternString, 430, 250, 280, "center");

    // Lamp post at the left of the dock (inset so the arm is not clipped)
    drawSprite(images.lampPost, 130, dockTop + 6, 150, "feet");

    // Cargo and fixtures along the dock (feet planted on the deck)
    drawSprite(images.crate, 250, dockTop + 4, 86, "feet");
    drawSprite(images.barrel, 340, dockTop + 4, 80, "feet");
    drawSprite(images.rope, 430, dockTop + 6, 92, "feet");
    drawSprite(images.lifeRing, 540, dockTop + 2, 96, "feet");
    drawSprite(images.basket, 640, dockTop + 4, 86, "feet");
    drawSprite(images.bell, 730, dockTop + 2, 80, "feet");
    drawSprite(images.bollard, 820, dockTop + 4, 70, "feet");
    drawSprite(images.cleat, 890, dockTop + 6, 64, "feet");
    drawSprite(images.signboard, 990, dockTop + 2, 86, "feet");
    drawSprite(images.anchor, 1045, dockTop + 2, 78, "feet");

    // Hanging fish just under the lantern string
    drawSprite(images.fish, 400, 300, 80, "center");

    // Gangplank stored flat on the deck near the end
    drawSprite(images.gangplank, 1088, dockTop + 4, 130, "feet");

    // Starfish on the dock corner
    drawSprite(images.starfish, 160, dockTop + 6, 54, "feet");

    // A couple of piling props at the dock end, in the water
    drawSprite(images.piling, 1140, 700, 140, "feet");

    // Lantern reflections in open water, pulsing slightly
    const pulse = 0.4 + 0.18 * Math.sin(time * 2);
    drawSprite(images.reflection, 130, 590, 64, "center", pulse);
    drawSprite(images.reflection, 400, 575, 72, "center", pulse * 0.85);

    // Buoys
    buoys.forEach(function (b) {
      const bob = Math.sin(time * 1.6 + b.phase) * 7;
      drawSprite(images.buoy, b.x, b.y + bob, b.size, "center");
    });
  }

  function drawBoat(time) {
    const bob = Math.sin(time * 2.2 + boat.x * 0.02) * 5;
    drawSprite(images.rowboat, boat.x, boat.y + bob, 180, "center");
  }

  function drawHud() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.font = "16px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "rgba(251, 246, 236, 0.92)";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("Arrow keys or WASD to row the boat", 24, VIEW_H - 36);
    ctx.fillText("Harbor props by Lanternbay Studio", 24, VIEW_H - 16);

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(251, 246, 236, 0.7)";
    ctx.fillText("Quiet Harbor sample scene", VIEW_W - 24, VIEW_H - 16);

    ctx.restore();
  }

  function update(dt, time) {
    const accel = 280;
    const maxSpeed = 220;
    let ax = 0;
    let ay = 0;
    if (keys.ArrowLeft || keys.a || keys.A) ax -= accel;
    if (keys.ArrowRight || keys.d || keys.D) ax += accel;
    if (keys.ArrowUp || keys.w || keys.W) ay -= accel * 0.7;
    if (keys.ArrowDown || keys.s || keys.S) ay += accel * 0.7;

    boat.vx += ax * dt;
    boat.vy += ay * dt;
    // Water drag
    boat.vx *= Math.pow(0.08, dt);
    boat.vy *= Math.pow(0.08, dt);

    const speed = Math.hypot(boat.vx, boat.vy);
    if (speed > maxSpeed) {
      boat.vx = (boat.vx / speed) * maxSpeed;
      boat.vy = (boat.vy / speed) * maxSpeed;
    }

    boat.x += boat.vx * dt;
    boat.y += boat.vy * dt;

    boat.x = clamp(boat.x, 80, WORLD_W - 80);
    // Stay in the water, not up on the dock or off the bottom
    const minY = 580;
    const maxY = VIEW_H - 70;
    boat.y = clamp(boat.y, minY, maxY);

    // Seagull drift
    seagulls.forEach(function (s) {
      s.x += s.speed * dt;
      if (s.x > WORLD_W + 80) s.x = -80;
    });

    const target = clamp(boat.x - VIEW_W * 0.48, 0, Math.max(0, WORLD_W - VIEW_W));
    camX += (target - camX) * Math.min(1, 4 * dt);
  }

  function render(time) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const dpr = canvas.width / VIEW_W;
    ctx.setTransform(dpr, 0, 0, dpr, -camX * dpr, 0);

    drawSky();
    drawWater(time);
    drawDock();
    drawProps(time);
    drawWaves(time);
    drawBoat(time);
    drawHud();
  }

  function loop(now) {
    if (!startTime) startTime = now;
    const time = (now - startTime) / 1000;
    if (!loop.last) loop.last = now;
    const dt = clamp((now - loop.last) / 1000, 0, 0.05);
    loop.last = now;
    update(dt, time);
    render(time);
    requestAnimationFrame(loop);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(VIEW_W * dpr);
    canvas.height = Math.round(VIEW_H * dpr);
  }

  function bindInput() {
    window.addEventListener("keydown", function (e) {
      keys[e.key] = true;
      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === " "
      ) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", function (e) {
      keys[e.key] = false;
    });
    window.addEventListener("blur", function () {
      Object.keys(keys).forEach(function (k) {
        keys[k] = false;
      });
    });
  }

  function showError(message) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1e2a3a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4e6c8";
    ctx.font = "20px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  }

  function init() {
    canvas = document.getElementById("harbor");
    ctx = canvas.getContext("2d");
    if (!ctx) {
      document.body.appendChild(
        document.createTextNode("This browser could not create a 2D canvas context.")
      );
      return;
    }
    resize();
    window.addEventListener("resize", resize);
    bindInput();

    loadImages()
      .then(function () {
        document.documentElement.setAttribute("data-ready", "true");
        requestAnimationFrame(loop);
      })
      .catch(function (err) {
        showError(err.message || "Could not load harbor props.");
        console.error(err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
