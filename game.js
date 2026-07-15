(function () {
  const GRID_SIZE = 24;
  const INITIAL_LIVES = 3;
  const BASE_SPEED = 110;
  const FOOD_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#06b6d4', '#a855f7'];
  const BONUS_COLORS = ['#f4d07f', '#f59e0b', '#fcd34d', '#10b981', '#38bdf8', '#fb7185'];
  const HIGHEST_KEY = 'gr8davidjo-snake-high-score';

  class SnakeGame {
    constructor(options) {
      this.canvas = options.canvas;
      this.ctx = this.canvas.getContext('2d');
      this.stage = options.stage;
      this.scoreEl = options.scoreEl;
      this.bestEl = options.bestEl;
      this.livesEl = options.livesEl;
      this.stateEl = options.stateEl;
      this.overlayEl = options.overlayEl;
      this.startBtn = options.startBtn;
      this.pauseBtn = options.pauseBtn;
      this.restartBtn = options.restartBtn;
      this.touchButtons = options.touchButtons;

      this.bestScore = Number(localStorage.getItem(HIGHEST_KEY) || 0);
      this.resizeHandler = () => this.resize();
      this.keyHandler = (event) => this.handleKeydown(event);
      this.pointerStart = null;
      this.loopId = null;
      this.restartTimeoutId = null;
      this.state = 'idle';

      this.bindEvents();
      this.reset(true);
      this.render();
      this.syncUi();
      this.showOverlay('Press Start or use Arrow keys, WASD, or swipe on mobile.');
    }

    bindEvents() {
      window.addEventListener('resize', this.resizeHandler);
      window.addEventListener('keydown', this.keyHandler);

      this.stage.addEventListener('pointerdown', (event) => {
        this.pointerStart = { x: event.clientX, y: event.clientY };
      });

      this.stage.addEventListener('pointerup', (event) => {
        if (!this.pointerStart) return;
        const dx = event.clientX - this.pointerStart.x;
        const dy = event.clientY - this.pointerStart.y;
        this.pointerStart = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;

        if (Math.abs(dx) > Math.abs(dy)) {
          this.queueDirection(dx > 0 ? 'right' : 'left');
        } else {
          this.queueDirection(dy > 0 ? 'down' : 'up');
        }
      });

      this.startBtn.addEventListener('click', () => this.start());
      this.pauseBtn.addEventListener('click', () => this.togglePause());
      this.restartBtn.addEventListener('click', () => this.restart());

      this.touchButtons.forEach((button) => {
        button.addEventListener('click', () => {
          if (button.dataset.dir) {
            this.queueDirection(button.dataset.dir);
            this.start();
            return;
          }
          if (button.dataset.action === 'pause') {
            this.togglePause();
          }
        });
      });
    }

    resize() {
      const rect = this.stage.getBoundingClientRect();
      const size = Math.max(220, Math.floor(Math.min(rect.width || 360, rect.height || 360)));
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.floor(size * dpr);
      this.canvas.height = Math.floor(size * dpr);
      this.pixelSize = size / GRID_SIZE;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.render();
    }

    reset(fresh = false) {
      this.snake = [
        { x: 11, y: 12 },
        { x: 10, y: 12 },
        { x: 9, y: 12 },
      ];
      this.direction = { x: 1, y: 0 };
      this.nextDirection = { x: 1, y: 0 };
      this.score = fresh ? 0 : this.score;
      this.lives = fresh ? INITIAL_LIVES : this.lives;
      this.speed = BASE_SPEED;
      this.bonus = null;
      this.bonusExpiresAt = 0;
      this.bonusCooldown = this.randomBetween(90, 140);
      this.food = this.spawnCell(this.snake);
      this.foodColor = this.choice(FOOD_COLORS);
      this.gameOver = false;
      this.state = fresh ? 'idle' : this.state;
      this.clearPendingRestart();
      this.resize();
    }

    start() {
      if (this.gameOver) {
        this.reset(true);
      }

      if (this.loopId != null) {
        this.state = 'running';
        this.syncUi();
        this.hideOverlay();
        return;
      }

      this.state = 'running';
      this.loopId = window.setInterval(() => this.tick(), this.speed);
      this.syncUi();
      this.hideOverlay();
    }

    restartLoop() {
      if (this.loopId != null) {
        window.clearInterval(this.loopId);
        this.loopId = window.setInterval(() => this.tick(), this.speed);
      }
    }

    pause() {
      if (this.state !== 'running') return;
      this.state = 'paused';
      this.clearLoop();
      this.syncUi();
      this.showOverlay('Paused. Press Resume or Space to continue.');
    }

    resume() {
      if (this.state !== 'paused') return;
      this.start();
    }

    togglePause() {
      if (this.state === 'running') {
        this.pause();
      } else if (this.state === 'paused') {
        this.resume();
      } else {
        this.start();
      }
    }

    restart() {
      this.clearPendingRestart();
      this.clearLoop();
      this.reset(true);
      this.start();
    }

    clearLoop() {
      if (this.loopId != null) {
        window.clearInterval(this.loopId);
        this.loopId = null;
      }
    }

    clearPendingRestart() {
      if (this.restartTimeoutId != null) {
        window.clearTimeout(this.restartTimeoutId);
        this.restartTimeoutId = null;
      }
    }

    tick() {
      this.direction = this.nextDirection;
      const head = this.snake[0];
      const nextHead = {
        x: head.x + this.direction.x,
        y: head.y + this.direction.y,
      };

      if (this.isWallCollision(nextHead) || this.isSelfCollision(nextHead)) {
        this.handleCrash();
        return;
      }

      this.snake.unshift(nextHead);
      let shouldSpeedUp = false;

      if (this.sameCell(nextHead, this.food)) {
        this.score += 10;
        this.food = this.spawnCell(this.snake);
        this.foodColor = this.choice(FOOD_COLORS);
        this.bonusCooldown = this.randomBetween(80, 130);
        this.speed = Math.max(70, BASE_SPEED - Math.floor(this.score / 40) * 8);
        shouldSpeedUp = true;
      } else {
        this.snake.pop();
      }

      if (this.bonus && this.sameCell(nextHead, this.bonus.position)) {
        this.lives += 1;
        this.score += 5;
        this.bonus = null;
        this.bonusCooldown = this.randomBetween(85, 140);
      }

      this.bonusCooldown -= 1;
      if (!this.bonus && this.bonusCooldown <= 0) {
        this.spawnBonus();
      }

      if (this.bonus) {
        this.bonusExpiresAt -= 1;
        if (this.bonusExpiresAt <= 0) {
          this.bonus = null;
          this.bonusCooldown = this.randomBetween(95, 150);
        }
      }

      this.syncUi();
      this.render();

      if (shouldSpeedUp) {
        this.restartLoop();
      }
    }

    handleCrash() {
      this.lives -= 1;
      this.syncUi();

      if (this.lives <= 0) {
        this.gameOver = true;
        this.state = 'gameover';
        this.clearLoop();
        this.updateBest();
        this.render();
        this.showOverlay('Game over. Press Restart to play again.');
        return;
      }

      this.state = 'recovering';
      this.clearLoop();
      this.showOverlay('A life was lost. Recovering shortly.');
      this.restartTimeoutId = window.setTimeout(() => {
        this.restartTimeoutId = null;
        this.snake = [
          { x: 11, y: 12 },
          { x: 10, y: 12 },
          { x: 9, y: 12 },
        ];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.food = this.spawnCell();
        this.foodColor = this.choice(FOOD_COLORS);
        this.bonus = null;
        this.bonusCooldown = this.randomBetween(85, 135);
        this.state = 'running';
        this.start();
      }, 650);
    }

    spawnBonus() {
      this.bonus = {
        position: this.spawnCell([this.food, ...this.snake]),
        color: this.choice(BONUS_COLORS),
      };
      this.bonusExpiresAt = this.randomBetween(24, 36);
    }

    spawnCell(blocked = []) {
      let position = null;
      let attempts = 0;

      do {
        position = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        };
        attempts += 1;
      } while (blocked.some((cell) => this.sameCell(cell, position)) && attempts < 300);

      return position;
    }

    sameCell(a, b) {
      return a && b && a.x === b.x && a.y === b.y;
    }

    isWallCollision(cell) {
      return cell.x < 0 || cell.y < 0 || cell.x >= GRID_SIZE || cell.y >= GRID_SIZE;
    }

    isSelfCollision(cell) {
      return this.snake.some((segment) => this.sameCell(segment, cell));
    }

    queueDirection(name) {
      const next = this.vectorFor(name);
      if (!next) return;

      const opposite = this.direction.x + next.x === 0 && this.direction.y + next.y === 0;
      if (opposite && this.snake.length > 1) return;

      this.nextDirection = next;
      if (this.state === 'idle' || this.state === 'paused') {
        this.start();
      }
    }

    handleKeydown(event) {
      const key = event.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') {
        event.preventDefault();
        this.queueDirection('up');
      } else if (key === 'arrowdown' || key === 's') {
        event.preventDefault();
        this.queueDirection('down');
      } else if (key === 'arrowleft' || key === 'a') {
        event.preventDefault();
        this.queueDirection('left');
      } else if (key === 'arrowright' || key === 'd') {
        event.preventDefault();
        this.queueDirection('right');
      } else if (key === ' ' || key === 'spacebar') {
        event.preventDefault();
        this.togglePause();
      } else if (key === 'enter') {
        event.preventDefault();
        this.start();
      }
    }

    vectorFor(name) {
      const map = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      };
      return map[name] || null;
    }

    randomBetween(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    choice(values) {
      return values[Math.floor(Math.random() * values.length)];
    }

    syncUi() {
      this.updateBest();
      this.scoreEl.textContent = String(this.score);
      this.bestEl.textContent = String(this.bestScore);
      this.livesEl.textContent = String(this.lives);
      this.stateEl.textContent = this.state === 'running'
        ? 'Running'
        : this.state === 'paused'
          ? 'Paused'
          : this.state === 'gameover'
            ? 'Game Over'
            : this.state === 'recovering'
              ? 'Recovering'
              : 'Ready';

      this.startBtn.textContent = this.state === 'gameover' ? 'Restart' : 'Start';
      this.pauseBtn.textContent = this.state === 'paused' ? 'Resume' : 'Pause';
    }

    updateBest() {
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        localStorage.setItem(HIGHEST_KEY, String(this.bestScore));
      }
    }

    showOverlay(message) {
      this.overlayEl.textContent = message;
      this.overlayEl.classList.remove('is-hidden');
    }

    hideOverlay() {
      this.overlayEl.classList.add('is-hidden');
    }

    render() {
      const rect = this.canvas.getBoundingClientRect();
      const size = Math.max(220, Math.floor(Math.min(rect.width || 360, rect.height || 360)));
      const cell = size / GRID_SIZE;
      const ctx = this.ctx;

      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#0f131b';
      ctx.fillRect(0, 0, size, size);

      this.drawGrid(ctx, size, cell);
      this.drawFood(ctx, cell);
      this.drawBonus(ctx, cell);
      this.drawSnake(ctx, cell);
      this.drawBorder(ctx, size);
    }

    drawGrid(ctx, size, cell) {
      ctx.save();
      ctx.strokeStyle = 'rgba(199, 162, 75, 0.08)';
      ctx.lineWidth = 1;

      for (let i = 0; i <= GRID_SIZE; i += 1) {
        const pos = Math.round(i * cell) + 0.5;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(size, pos);
        ctx.stroke();
      }

      ctx.restore();
    }

    drawFood(ctx, cell) {
      ctx.save();
      ctx.fillStyle = this.foodColor;
      this.roundRect(
        ctx,
        this.food.x * cell + 3,
        this.food.y * cell + 3,
        cell - 6,
        cell - 6,
        Math.max(4, cell * 0.25),
      );
      ctx.fill();
      ctx.restore();
    }

    drawBonus(ctx, cell) {
      if (!this.bonus) return;
      const { x, y } = this.bonus.position;
      const px = x * cell + cell / 2;
      const py = y * cell + cell / 2;
      const radius = Math.max(6, cell * 0.36);

      ctx.save();
      ctx.fillStyle = this.bonus.color;
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? radius : radius * 0.48;
        const sx = px + Math.cos(angle) * r;
        const sy = py + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    drawSnake(ctx, cell) {
      this.snake.forEach((segment, index) => {
        const px = segment.x * cell + 2;
        const py = segment.y * cell + 2;
        const size = cell - 4;
        ctx.save();
        ctx.fillStyle = index === 0 ? '#f5d084' : `hsl(${44 + index * 7} 68% 42%)`;
        this.roundRect(ctx, px, py, size, size, Math.max(5, cell * 0.22));
        ctx.fill();
        if (index === 0) {
          ctx.fillStyle = '#111827';
          ctx.beginPath();
          ctx.arc(px + size * 0.68, py + size * 0.32, Math.max(1.4, cell * 0.09), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    }

    drawBorder(ctx, size) {
      ctx.save();
      ctx.strokeStyle = 'rgba(199, 162, 75, 0.24)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, size - 2, size - 2);
      ctx.restore();
    }

    roundRect(ctx, x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r);
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }

  function boot() {
    const canvas = document.getElementById('snake-canvas');
    const stage = document.querySelector('[data-stage]');
    if (!canvas || !stage) return;

    const game = new SnakeGame({
      canvas,
      stage,
      scoreEl: document.querySelector('[data-score]'),
      bestEl: document.querySelector('[data-best]'),
      livesEl: document.querySelector('[data-lives]'),
      stateEl: document.querySelector('[data-state]'),
      overlayEl: document.querySelector('[data-overlay]'),
      startBtn: document.querySelector('[data-start]'),
      pauseBtn: document.querySelector('[data-pause]'),
      restartBtn: document.querySelector('[data-restart]'),
      touchButtons: Array.from(document.querySelectorAll('.touch-button')),
    });

    window.snakeGame = game;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
