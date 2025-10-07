const MAZE_ROWS = 19;
const MAZE_COLS = 19;

const BUG_COUNT = 18;
const PARTICLE_COUNT = 80;

const DIRECTIONS = [
  { dx: 1, dy: 0, angle: 0 },
  { dx: -1, dy: 0, angle: Math.PI },
  { dx: 0, dy: 1, angle: Math.PI / 2 },
  { dx: 0, dy: -1, angle: -Math.PI / 2 }
];

export class Screensaver {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  this.maze = new Maze(MAZE_ROWS, MAZE_COLS);
  this.debugger = new Debugger(this.maze);

  const seeded = new Set();
  this.bugs = Array.from({ length: BUG_COUNT }, () => new Bug(this.maze, seeded));
    this.particles = new ParticleField(PARTICLE_COUNT);
  this.sparks = [];

    this.width = canvas.width;
    this.height = canvas.height;
    this.tileSize = 24;
    this.lastTime = 0;
    this.elapsed = 0;
    this.running = false;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.tileSize = Math.min(
      width / this.maze.cols,
      height / this.maze.rows
    );
    this.debugger.setTileSize(this.tileSize);
    this.bugs.forEach((bug) => bug.setTileSize(this.tileSize));
    this.particles.setBounds(width, height);
    this.sparks = [];
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (time) => {
      if (!this.running) {
        return;
      }
      const delta = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;
      this.elapsed += delta;

      this.update(delta);
      this.draw();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  update(delta) {
    this.debugger.update(delta, this.bugs, this.elapsed, (position) => {
      this.spawnSpark(position);
    });

    const occupied = new Set();
    this.bugs.forEach((bug) => {
      if (!bug.eaten) {
        occupied.add(bug.key);
      }
    });

    this.bugs.forEach((bug) =>
      bug.update(delta, this.elapsed, this.maze, occupied)
    );

    this.particles.update(delta);
    this.sparks.forEach((spark) => spark.update(delta));
    this.sparks = this.sparks.filter((spark) => spark.isAlive());
  }

  spawnSpark(position) {
    const burst = 3;
    for (let i = 0; i < burst; i++) {
      this.sparks.push(new Spark(position, this.tileSize, i / burst));
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, "rgba(22, 28, 70, 0.9)");
    gradient.addColorStop(0.6, "rgba(10, 14, 38, 0.94)");
    gradient.addColorStop(1, "rgba(6, 8, 24, 0.88)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    this.particles.draw(ctx);

    const offsetX = (this.width - this.tileSize * this.maze.cols) / 2;
    const offsetY = (this.height - this.tileSize * this.maze.rows) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);

    this.maze.draw(ctx, this.tileSize);
    this.bugs.forEach((bug) => bug.draw(ctx));
  this.sparks.forEach((spark) => spark.draw(ctx));
    this.debugger.draw(ctx);

    ctx.restore();

    ctx.restore();
  }
}

class Maze {
  constructor(rows, cols) {
    this.rows = rows % 2 === 0 ? rows + 1 : rows;
    this.cols = cols % 2 === 0 ? cols + 1 : cols;
    this.walls = this.generateLayout();
    this.pathCells = this.collectPathCells();
  }

  generateLayout() {
    const rows = this.rows;
    const cols = this.cols;
    const grid = Array.from({ length: rows }, () => Array(cols).fill("#"));

    const start = { row: 1, col: 1 };
    grid[start.row][start.col] = ".";

    const stack = [start];
    const carveDirs = [
      { dr: 0, dc: 2 },
      { dr: 0, dc: -2 },
      { dr: 2, dc: 0 },
      { dr: -2, dc: 0 }
    ];

    const shuffle = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    while (stack.length) {
      const current = stack[stack.length - 1];
      const neighbors = shuffle(carveDirs.slice()).filter((dir) => {
        const nr = current.row + dir.dr;
        const nc = current.col + dir.dc;
        return nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && grid[nr][nc] === "#";
      });

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const dir = neighbors[0];
        const betweenRow = current.row + dir.dr / 2;
        const betweenCol = current.col + dir.dc / 2;
        const next = { row: current.row + dir.dr, col: current.col + dir.dc };
        grid[betweenRow][betweenCol] = ".";
        grid[next.row][next.col] = ".";
        stack.push(next);
      }
    }

    this.addLoops(grid, Math.floor((rows * cols) * 0.12));
    this.addRooms(grid);
    return grid;
  }

  addLoops(grid, attempts) {
    const rows = grid.length;
    const cols = grid[0].length;
    for (let i = 0; i < attempts; i++) {
      const r = 1 + Math.floor(Math.random() * (rows - 2));
      const c = 1 + Math.floor(Math.random() * (cols - 2));
      if (grid[r][c] !== "#") continue;

      const vertical = grid[r - 1][c] === "." && grid[r + 1][c] === ".";
      const horizontal = grid[r][c - 1] === "." && grid[r][c + 1] === ".";
      if (vertical || horizontal) {
        grid[r][c] = ".";
      }
    }
  }

  addRooms(grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    const radius = Math.floor(Math.min(rows, cols) / 6);
    const centerRow = Math.floor(rows / 2);
    const centerCol = Math.floor(cols / 2);

    for (let r = centerRow - radius; r <= centerRow + radius; r++) {
      for (let c = centerCol - radius; c <= centerCol + radius; c++) {
        if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1) {
          const dist = Math.hypot(r - centerRow, c - centerCol);
          if (dist <= radius) {
            grid[r][c] = ".";
          }
        }
      }
    }
  }

  collectPathCells() {
    const cells = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.walls[r][c] !== "#") {
          cells.push({ row: r, col: c });
        }
      }
    }
    return cells;
  }

  isOpen(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return false;
    }
    return this.walls[row][col] !== "#";
  }

  getNeighbors(row, col) {
    return DIRECTIONS.filter((dir) => this.isOpen(row + dir.dy, col + dir.dx));
  }

  getRandomPathCell() {
    const navigable = this.pathCells.filter(
      (cell) => this.getNeighbors(cell.row, cell.col).length > 0
    );
    const pool = navigable.length ? navigable : this.pathCells;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  draw(ctx, tileSize) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let r = 0; r <= this.rows; r++) {
      const y = r * tileSize;
      ctx.moveTo(0, y);
      ctx.lineTo(this.cols * tileSize, y);
    }
    for (let c = 0; c <= this.cols; c++) {
      const x = c * tileSize;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.rows * tileSize);
    }
    ctx.stroke();

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = c * tileSize;
        const y = r * tileSize;
        if (this.walls[r][c] === "#") {
          const tileGradient = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
          tileGradient.addColorStop(0, "rgba(38, 49, 112, 0.92)");
          tileGradient.addColorStop(1, "rgba(18, 26, 68, 0.92)");

          ctx.fillStyle = tileGradient;
          this.roundRect(ctx, x + 3, y + 3, tileSize - 6, tileSize - 6, tileSize * 0.18);
          ctx.fill();

          ctx.strokeStyle = "rgba(82, 111, 255, 0.25)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          const inset = Math.min(tileSize * 0.32, 10);
          const glowGradient = ctx.createRadialGradient(
            x + tileSize / 2,
            y + tileSize / 2,
            tileSize * 0.1,
            x + tileSize / 2,
            y + tileSize / 2,
            tileSize * 0.55
          );
          glowGradient.addColorStop(0, "rgba(30, 50, 110, 0.35)");
          glowGradient.addColorStop(1, "rgba(30, 50, 110, 0)");

          ctx.fillStyle = glowGradient;
          ctx.fillRect(x, y, tileSize, tileSize);

          ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
          ctx.fillRect(x + inset, y + inset, tileSize - inset * 2, tileSize - inset * 2);
        }
      }
    }
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

class Debugger {
  constructor(maze) {
    this.maze = maze;
    const start = this.maze.getRandomPathCell();
    this.current = { ...start };
    this.direction = DIRECTIONS[0];
    this.target = { row: start.row, col: start.col };
    this.progress = 0;
    this.speed = 2.8; // cells per second
    this.mouthTimer = 0;
    this.tileSize = 24;
    this.position = this.getTileCenter(this.current.col, this.current.row);
    this.eyePulse = Math.random() * Math.PI * 2;
    this.trail = [];
    this.maxTrail = 10;
    this.highlight = 0;
    this.munchBurst = 0;

    this.chooseNextDirection();
  }

  setTileSize(tileSize) {
    this.tileSize = tileSize;
    this.position = this.getTileCenter(this.current.col, this.current.row);
    this.trail = [];
  }

  update(delta, bugs, time, onBugEaten) {
    this.mouthTimer += delta * 5.5;
    this.eyePulse += delta * 3.2;
    this.highlight = Math.max(0, this.highlight - delta * 2.8);
    this.munchBurst = Math.max(0, this.munchBurst - delta * 2.6);

    this.progress += delta * this.speed;
    while (this.progress >= 1) {
      this.progress -= 1;
      this.current = { ...this.target };
      this.trail.unshift({
        x: this.position.x,
        y: this.position.y,
        life: 0.5
      });
      if (this.trail.length > this.maxTrail) {
        this.trail.pop();
      }
      this.consume(bugs, time, onBugEaten);
      this.chooseNextDirection();
    }

    this.updatePosition();
    this.trail.forEach((segment) => {
      segment.life = Math.max(0, segment.life - delta * 0.9);
    });
    this.trail = this.trail.filter((segment) => segment.life > 0);
    this.consume(bugs, time, onBugEaten);
  }

  updatePosition() {
    const currentCenter = this.getTileCenter(this.current.col, this.current.row);
    const targetCenter = this.getTileCenter(this.target.col, this.target.row);

    this.position = {
      x: currentCenter.x + (targetCenter.x - currentCenter.x) * this.progress,
      y: currentCenter.y + (targetCenter.y - currentCenter.y) * this.progress
    };
  }

  getTileCenter(col, row) {
    return {
      x: (col + 0.5) * this.tileSize,
      y: (row + 0.5) * this.tileSize
    };
  }

  chooseNextDirection() {
    const options = this.maze.getNeighbors(this.current.row, this.current.col);
    if (options.length === 0) {
      const restart = this.maze.getRandomPathCell();
      this.current = { ...restart };
      this.target = { ...restart };
      this.position = this.getTileCenter(restart.col, restart.row);
      this.progress = 0;
      this.chooseNextDirection();
      return;
    }

    const reverse = {
      dx: -this.direction.dx,
      dy: -this.direction.dy
    };

    const filtered = options.filter((dir) =>
      options.length > 1
        ? !(dir.dx === reverse.dx && dir.dy === reverse.dy)
        : true
    );

    this.direction =
      filtered[Math.floor(Math.random() * filtered.length)] || options[0];
    this.target = {
      row: this.current.row + this.direction.dy,
      col: this.current.col + this.direction.dx
    };
  }

  consume(bugs, time, onBugEaten) {
    const radius = this.tileSize * 0.45;
    for (const bug of bugs) {
      if (bug.eaten) continue;
      const dx = bug.position.x - this.position.x;
      const dy = bug.position.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < radius) {
        bug.markEaten(time);
        this.highlight = 1;
        this.munchBurst = 1;
        if (onBugEaten) {
          onBugEaten({ x: bug.position.x, y: bug.position.y });
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();

    this.drawTrail(ctx);

    ctx.translate(this.position.x, this.position.y);

    const bodyWidth = this.tileSize * 0.82;
    const bodyHeight = this.tileSize * 0.96;
    const headRadius = bodyWidth / 2;
    const headCenterY = -bodyHeight * 0.28;
    const bottomY = bodyHeight * 0.48;
    const waveCount = 4;
    const waveWidth = bodyWidth / waveCount;
    const waveAmplitude = (this.tileSize * 0.08 + this.tileSize * 0.05 * this.highlight) * (1 + this.munchBurst * 0.45);
    const wavePhase = this.mouthTimer * 0.85;
    const auraStrength = Math.max(this.highlight, this.munchBurst) * 0.8;
    const facingX = Math.cos(this.direction.angle);
    const facingY = Math.sin(this.direction.angle);

    if (auraStrength > 0.02) {
      ctx.save();
      ctx.globalAlpha = 0.28 + auraStrength * 0.45;
      const auraRadiusX = bodyWidth * (1.15 + auraStrength * 0.45);
      const auraRadiusY = bodyHeight * (0.85 + auraStrength * 0.35);
      const auraGradient = ctx.createRadialGradient(0, headCenterY, this.tileSize * 0.15, 0, headCenterY, auraRadiusY);
      auraGradient.addColorStop(0, "rgba(190, 245, 255, 0.8)");
      auraGradient.addColorStop(1, "rgba(190, 245, 255, 0)");
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.ellipse(0, headCenterY, auraRadiusX, auraRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.moveTo(-headRadius, bottomY);
    ctx.lineTo(-headRadius, headCenterY);
    ctx.arc(0, headCenterY, headRadius, Math.PI, 0, false);
    ctx.lineTo(headRadius, bottomY);

    for (let i = 0; i < waveCount; i++) {
      const startX = headRadius - waveWidth * i;
      const endX = startX - waveWidth;
      const midX = (startX + endX) / 2;
      const wobble = waveAmplitude * Math.sin(wavePhase + i);
      ctx.quadraticCurveTo(midX, bottomY + wobble, endX, bottomY);
    }

    ctx.closePath();

    const bodyGradient = ctx.createLinearGradient(0, headCenterY - headRadius, 0, bottomY + waveAmplitude);
    bodyGradient.addColorStop(0, `rgba(168, 236, 255, ${0.88 + this.highlight * 0.08})`);
    bodyGradient.addColorStop(0.55, `rgba(110, 198, 255, ${0.82 + this.highlight * 0.08})`);
    bodyGradient.addColorStop(1, `rgba(60, 120, 230, ${0.74 + this.highlight * 0.05})`);

    ctx.shadowColor = `rgba(110, 220, 255, ${0.4 + this.highlight * 0.4 + this.munchBurst * 0.35})`;
    ctx.shadowBlur = this.tileSize * (0.65 + this.highlight * 0.5 + this.munchBurst * 0.35);
    ctx.fillStyle = bodyGradient;
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.lineWidth = this.tileSize * 0.05;
    ctx.strokeStyle = "rgba(220, 245, 255, 0.35)";
    ctx.stroke();

    const chomp = 0.45 + Math.sin(this.mouthTimer * 1.35) * 0.25;
    const biteHeight = this.tileSize * 0.38 * chomp * (1 + this.munchBurst * 0.35);
    const biteLength = this.tileSize * (0.38 + this.munchBurst * 0.22);

    ctx.save();
    ctx.rotate(this.direction.angle);
    ctx.beginPath();
    ctx.moveTo(this.tileSize * 0.08, -biteHeight / 2);
    ctx.quadraticCurveTo(biteLength, 0, this.tileSize * 0.08, biteHeight / 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(18, 28, 64, 0.7)";
    ctx.fill();
    ctx.restore();

    const eyeSpacing = bodyWidth * 0.28;
    const eyeY = headCenterY - this.tileSize * 0.02;
    const eyeRadiusX = this.tileSize * 0.16;
    const eyeRadiusY = this.tileSize * 0.22;
    const pupilRadius = this.tileSize * 0.075;
    const pupilOffsetX = facingX * this.tileSize * 0.11 + Math.sin(this.eyePulse) * this.tileSize * 0.015;
    const pupilOffsetY = facingY * this.tileSize * 0.09 + Math.cos(this.eyePulse * 1.1) * this.tileSize * 0.015;

    for (const side of [-1, 1]) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.beginPath();
      ctx.ellipse(side * eyeSpacing, eyeY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0f1f3a";
      ctx.beginPath();
      ctx.arc(side * eyeSpacing + pupilOffsetX, eyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(188, 255, 255, 0.7)";
      ctx.beginPath();
      ctx.arc(side * eyeSpacing + pupilOffsetX * 0.6, eyeY + pupilOffsetY * 0.6 - pupilRadius * 0.45, pupilRadius * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawTrail(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const segment of this.trail) {
      ctx.save();
      ctx.globalAlpha = segment.life * 0.55;
      ctx.translate(segment.x, segment.y);
      const radius = this.tileSize * (0.18 + 0.12 * segment.life);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, "rgba(150, 235, 255, 0.85)");
      gradient.addColorStop(1, "rgba(150, 235, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}

class Bug {
  constructor(maze, occupied = new Set()) {
    this.maze = maze;
    this.row = 0;
    this.col = 0;
    this.eaten = false;
    this.tileSize = 24;
    this.floatPhase = Math.random() * Math.PI * 2;
    this.position = { x: 0, y: 0 };
    this.respawnAt = 0;
    this.spawn(maze, occupied);
  }

  setTileSize(tileSize) {
    this.tileSize = tileSize;
    this.updatePosition();
  }

  get key() {
    return `${this.row},${this.col}`;
  }

  update(delta, time, maze, occupied) {
    this.floatPhase += delta;
    if (this.eaten && time >= this.respawnAt) {
      this.spawn(maze, occupied);
    }
    this.updatePosition();
  }

  spawn(maze, occupied = new Set()) {
    let attempts = 0;
    let cell;
    do {
      cell = maze.getRandomPathCell();
      attempts += 1;
    } while (occupied.has(`${cell.row},${cell.col}`) && attempts < 60);

    this.row = cell.row;
    this.col = cell.col;
    this.eaten = false;
    this.floatPhase = Math.random() * Math.PI * 2;
    this.respawnAt = 0;
    this.updatePosition();
    occupied.add(this.key);
  }

  markEaten(time) {
    this.eaten = true;
    this.respawnAt = time + 4 + Math.random() * 6;
  }

  updatePosition() {
    const center = {
      x: (this.col + 0.5) * this.tileSize,
      y: (this.row + 0.5) * this.tileSize
    };
    this.position = center;
  }

  draw(ctx) {
    if (this.eaten) return;

    ctx.save();
    const bob = Math.sin(this.floatPhase * 2) * this.tileSize * 0.08;
    ctx.translate(this.position.x, this.position.y + bob);

    ctx.shadowColor = "rgba(142, 249, 243, 0.6)";
    ctx.shadowBlur = this.tileSize * 0.25;

    const bodyGradient = ctx.createLinearGradient(0, -this.tileSize * 0.18, 0, this.tileSize * 0.18);
    bodyGradient.addColorStop(0, "#8ef9f3");
    bodyGradient.addColorStop(1, "#5fd3ff");

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.tileSize * 0.18, this.tileSize * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.ellipse(-this.tileSize * 0.3, -this.tileSize * 0.18, this.tileSize * 0.22, this.tileSize * 0.08, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(this.tileSize * 0.3, -this.tileSize * 0.18, this.tileSize * 0.22, this.tileSize * 0.08, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(13, 19, 48, 0.8)";
    ctx.beginPath();
    ctx.ellipse(0, this.tileSize * 0.08, this.tileSize * 0.08, this.tileSize * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class Spark {
  constructor(position, tileSize, offset = Math.random()) {
    this.x = position.x;
    this.y = position.y;
    this.tileSize = tileSize;
    this.radius = tileSize * 0.18;
    this.life = 0.55 + Math.random() * 0.25;
    this.rotation = Math.random() * Math.PI;
    this.spin = (Math.random() - 0.5) * 3;
    this.flightAngle = offset * Math.PI * 2;
    this.velocity = tileSize * (0.35 + Math.random() * 0.3);
  }

  update(delta) {
    this.life -= delta;
    this.radius += delta * this.tileSize * 1.25;
    this.x += Math.cos(this.flightAngle) * this.velocity * delta;
    this.y += Math.sin(this.flightAngle) * this.velocity * delta;
    this.velocity *= 0.9;
    this.rotation += this.spin * delta;
  }

  isAlive() {
    return this.life > 0;
  }

  draw(ctx) {
    if (this.life <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = Math.max(this.life, 0) * 1.1;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    gradient.addColorStop(0.35, "rgba(255, 210, 120, 0.9)");
    gradient.addColorStop(1, "rgba(255, 150, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

  ctx.rotate(this.rotation);
  ctx.strokeStyle = "rgba(255, 230, 180, 0.65)";
  ctx.lineWidth = Math.max(1, this.tileSize * 0.05);
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.75, 0);
    ctx.lineTo(this.radius * 0.75, 0);
    ctx.moveTo(0, -this.radius * 0.75);
    ctx.lineTo(0, this.radius * 0.75);
    ctx.stroke();

    ctx.restore();
  }
}

class ParticleField {
  constructor(count) {
    this.count = count;
    this.width = 800;
    this.height = 800;
    this.particles = Array.from({ length: count }, () => this.createParticle());
  }

  setBounds(width, height) {
    this.width = width;
    this.height = height;
    this.particles = Array.from({ length: this.count }, () => this.createParticle());
  }

  createParticle() {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      speed: 10 + Math.random() * 20,
      size: Math.random() * 1.4 + 0.4,
      hue: 200 + Math.random() * 60,
      alpha: 0.05 + Math.random() * 0.15
    };
  }

  update(delta) {
    this.particles.forEach((p) => {
      p.y += p.speed * delta;
      if (p.y > this.height) {
        p.x = Math.random() * this.width;
        p.y = -10;
      }
    });
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    this.particles.forEach((p) => {
      ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}
