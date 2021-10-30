'use strict';

var canvas = null;
var pop_sound = null;
const colors = ['red', 'blue', 'green', 'yellow', 'brown', 'purple', 'pink',
  'gray', 'orange', 'aqua', 'cornflowerblue', 'crimson',
  'darkred', 'darkseagreen', 'deepskyblue', 'greenyellow',
  'indigo', 'maroon', 'lightslategrey', 'mediumorchid', 'moccasin',
  'teal', 'tan'
];

function randomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

class ScoreBoard {
  constructor() {
    this.scores = [];
  }

  addScore(newName, newScore) {
    const maxScores = 10;
    let newIndex = this.scores.findIndex((v) => v.score < newScore);
    if (newIndex == -1 && this.scores.length < maxScores) {
      newIndex = this.scores.length;
    }
    if (newIndex >= 0) {
      this.scores.splice(newIndex, 0, { score: newScore, name: newName} );
      this.scores.splice(maxScores, 1);
    }
    return newIndex;
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.velX = 2 * Math.random() - 1;
    this.velY = -5 * Math.random();
  }

  update() {
    this.x += this.velX;
    this.y += this.velY;
    this.velY++;
  }  
}

class Explosion {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.frame = 0;
    this.particles = Array.from(Array(20), () => new Particle(x, y, color));
  }

  update() {
    if (++this.frame > 20) {
      return false;
    }

    for (let particle of this.particles) {
      particle.update();
    }
    return true;
  }
}

class Balloon {
  constructor(x, color) {
    this.height = Math.pow(Math.random(), 3) * 80 + 40;
    this.width = Math.pow(Math.random(), 2) * (this.height - 20) + 20;
    this.x = x;
    this.y = canvas.height + this.height;
    this.color1 = randomColor();
    this.color2 = randomColor();
    this.text = String.fromCharCode(Math.floor(Math.random() * 10) + 48);

    this.speed = Math.random() + 0.5;
    let len = Math.random() * 50 + 50;
    this.string = [
      [(Math.random() - 0.5) * 30, len / 3],
      [(Math.random() - 0.5) * 30, 2 * len / 3],
      [(Math.random() - 0.5) * 30, len],
    ];
  }
}

var canvas = null;
var balloons = [];
var burst_balloons = [];
var wind = 0;
var maxWindChange = 0.5;
var shoot = null;
var startTime = Date.now();
var lastSpawnTime = startTime;
var score = 0;
var scoreboard = new ScoreBoard();
const gameTime = 60 * 1000;
const twoPi = Math.PI * 2;
const spawnTime = 2000;

function drawBalloon(ctx, balloon) {
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = balloon.color1;

  ctx.beginPath();
  var height = balloon.height;
  var width = balloon.width * 2;
  var y = balloon.y;
  var x = balloon.x - balloon.width;
  var bottomY = y + height * 1.8;
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x, bottomY, x + width, bottomY, x + width, y);
  ctx.bezierCurveTo(x + width, y - height, x, y - height, x, y);
  ctx.fill();
  ctx.strokeStyle = balloon.color2;
  ctx.beginPath();
  var stringY = (y + 3 * bottomY) / 4;
  ctx.moveTo(balloon.x, stringY);
  let s = balloon.string;
  ctx.bezierCurveTo(
    balloon.x + s[0][0], stringY + s[0][1],
    balloon.x + s[1][0], stringY + s[1][1],
    balloon.x + s[2][0], stringY + s[2][1],
  );
  ctx.stroke();

  ctx.fillStyle = 'black';
  ctx.globalCompositeOperation = 'plus-darker';
  ctx.font = '' + (balloon.width + balloon.height) / 2 + 'px gill sans';
  ctx.fillText(balloon.text, balloon.x, y + height / 4);
}

function spawnBalloon() {
  let x = Math.floor(Math.random() * canvas.width);
  let b = new Balloon(x);
  balloons.push(b);
}

function gameOver(ctx) {
  window.removeEventListener("keypress", shootListener);

  let newPosition = scoreboard.addScore("Benji", score);
  let scores = scoreboard.scores;

  ctx.fillStyle = 'black';
  ctx.globalCompositeOperation = 'plus-darker';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '80px gill sans';
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 4 - 150);
  ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 4 - 50);
  ctx.font = '60px gill sans';
  ctx.fillText("Press Enter to Play Again", canvas.width / 2, 3 * canvas.height / 4 + 100);

  let startY = canvas.height / 4 + 50;
  let scoreSpaceY = 40;
  let positionX = canvas.width / 2 - 200;
  let nameX = positionX + 60;
  let scoreX = canvas.width / 2 + 250;
  ctx.font = '60px gill sans';
  for (let i = 0; i < scores.length; i++) {
    let y = startY + i * scoreSpaceY;
    if (i == newPosition) {
      ctx.font = 'bold 50px gill sans';
    } else {
      ctx.font = '50px gill sans';
    }
    ctx.textAlign = 'right';
    ctx.fillText((i + 1).toString() + ".", positionX, y);
    ctx.textAlign = 'left';
    ctx.fillText(scores[i].name, nameX, y);
    ctx.textAlign = 'right';
    ctx.fillText(scores[i].score.toString(), scoreX, y);
  }
  init();
}

function run() {
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let newBalloons = [];
  let current = null;
  let currentIndex = 0;
  let currentTime = Date.now();
  if (currentTime - spawnTime > lastSpawnTime) {
    spawnBalloon();
    lastSpawnTime = currentTime;
  }

  if (shoot != null) {
    for (let i = 0; i < balloons.length; ++i) {
      let balloon = balloons[i];
      if (balloon.text == shoot) {
        if (current == null || (balloon.y + balloon.height > current.y + current.height)) {
          current = balloon;
          currentIndex = i;
        }
      }
    }
    shoot = null;
    if (current != null) {
      pop_sound.currentTime = 0;
      pop_sound.play();
      burst_balloons.push(new Explosion(current.x, current.y, current.color));
      balloons.splice(currentIndex, 1);
      score += 10;
    } else {
      score--;
    }
  }

  var now = Date.now();
  var timeLeft = (gameTime - (now - startTime)) / 1000;

  if (timeLeft <= 0) {
    gameOver(ctx);
    return;
  }

  ctx.fillStyle = 'black';
  ctx.globalCompositeOperation = 'plus-darker';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '20px gill sans';
  ctx.fillText("Score: ", 0, 0);
  ctx.textAlign = 'right';
  ctx.fillText("" + score, 100, 0);

  ctx.fillText(timeLeft.toFixed(1), canvas.width - 10, 0);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < balloons.length; ++i) {
    let balloon = balloons[i];2727
    drawBalloon(ctx, balloon);
    let localWind = wind * (1.2 - 0.4 * Math.random());
    balloon.x = Math.min(Math.max(balloon.x + localWind, balloon.width), canvas.width - balloon.width);
    balloon.y -= balloon.speed;
    if (balloon.y + balloon.height + balloon.string[2][1] > 0) {
      newBalloons.push(balloon);
    }
  }

  let new_burst_balloons = [];

  for (let i = 0; i < burst_balloons.length; ++i) {
    let burst = burst_balloons[i];
    for (let p of burst.particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 2, 2, 0, 0, twoPi);
      ctx.fill();
    }

    if (burst.update()) {
      new_burst_balloons.push(burst);
    }
  }
  burst_balloons = new_burst_balloons;

  wind += (Math.random() - 0.5) * maxWindChange;
  const maxWind = 1;
  wind = Math.min(wind, maxWind);
  wind = Math.max(wind, -maxWind);
  balloons = newBalloons;
  window.requestAnimationFrame(run)
}

function init() {
  function enterListener(e) {
    if (e.code == 'Enter') {
      gameInit();
      document.getElementById('start_prompt').style.display = "none";
      window.removeEventListener("keypress", enterListener);
    }
  }
  window.addEventListener("keypress", enterListener, false);
}

function shootListener(e) {
  let digit = +e.key;
  if (!isNaN(digit)) {
    shoot = digit;
  }
}

function gameInit() {
  balloons = [];
  wind = 0;
  maxWindChange = 0.5;
  shoot = null;
  startTime = Date.now();
  lastSpawnTime = startTime;
  score = 0;

  window.addEventListener("keydown", shootListener, false);

  canvas = document.getElementById('game');
  // Need to figure out a better way to do this but they go as far out as on my
  // MBP, although there is still some padding at the bottom of the window.
  canvas.width = window.innerWidth - 8;
  canvas.height = window.innerHeight - 16;

  pop_sound = document.getElementById('pop_sound');
  pop_sound.volume = 0.5;

  run();
}
