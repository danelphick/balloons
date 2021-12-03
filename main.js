// @ts-check
'use strict';

var pop_sound = null;
var miss_sound = null;
var lose_life_sound = null;
var game_over_sound = null;
const colors = ['red', 'blue', 'green', 'yellow', 'brown', 'purple', 'pink',
  'gray', 'orange', 'aqua', 'cornflowerblue', 'crimson',
  'darkred', 'darkseagreen', 'deepskyblue', 'greenyellow',
  'indigo', 'maroon', 'lightslategrey', 'mediumorchid', 'moccasin',
  'teal', 'tan'
];

function randomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

const kScoresKey = "balloons_scores";
const kSavedVersionKey = "balloons_version";
const kCurrentVersion = 0.1;

class ScoreBoard {
  saveScores() {
    let stored_scores = [];
    for (let row of this.scores) {
      stored_scores.push([row.name, row.score]);
    }
    window.localStorage.setItem(kScoresKey, JSON.stringify(stored_scores));
    window.localStorage.setItem(kSavedVersionKey, kCurrentVersion.toFixed(1));
  }

  constructor() {
    let my_storage = window.localStorage;
    let version = Number.parseFloat(my_storage.getItem(kSavedVersionKey));
    let json_scores = null;
    // Reset all the scores if the stored version doesn't exist or it's not equal to source version.
    if (version == kCurrentVersion) {
      json_scores = my_storage.getItem(kScoresKey);
    }
    this.scores = [];
    if (json_scores === null) {
      for (let i = 0; i < 10; ++i) {
        this.addScore("", 0);
      }
      this.saveScores();
    } else {
      let stored_scores = JSON.parse(json_scores);
      for (let row of stored_scores) {
        this.addScore(row[0], row[1]);
      }
    }
  }

  /**
   * @param {number} position
   * @param {string} name
   */
  setName(position, name) {
    this.scores[position].name = name;
    this.saveScores();
  }

  /**
   * @param {string} newName
   */
  addScore(newName, newScore = 0) {
    const maxScores = 10;
    let newIndex = this.scores.findIndex((v) => v.score < newScore);
    if (newIndex == -1 && this.scores.length < maxScores) {
      newIndex = this.scores.length;
    }
    if (newIndex >= 0) {
      this.scores.splice(newIndex, 0, {
        score: newScore,
        name: newName
      });
      this.scores.splice(maxScores, 1);
    }
    return newIndex;
  }
}

class Particle {
  /**
   * @param {number} x
   * @param {number} y
   * @param {any} color
   */
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

class Sound {
  /**
   * @param {string} id
   */
  constructor(id, volume = 0.5) {
    /** @type {HTMLAudioElement} */
    this.audio = (document.getElementById(id));
    this.audio.volume = volume;
  }

  play() {
    this.audio.currentTime = 0;
    this.audio.play();
  }
}

class Explosion {
  /**
   * @param {number} x
   * @param {number} y
   * @param {any} color
   */
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
  /**
   * @param {number} x
   * @param {number} level
   */
  constructor(x, level) {
    this.height = Math.pow(Math.random(), 3) * 80 + 40;
    this.width = Math.pow(Math.random(), 2) * (this.height - 20) + 20;
    this.height *= scale;
    this.width *= scale;
    this.x = x;
    this.y = canvas.height + this.height;
    this.color1 = randomColor();
    this.color2 = randomColor();
    this.text = String.fromCharCode(Math.floor(Math.random() * 10) + 48);

    this.speed = Math.random() + 0.5 * Math.pow(1.2, level - 1);
    this.speed *= scale;
    let len = (Math.random() * 50 + 50) * scale;
    this.string = [
      [(Math.random() - 0.5) * 30 * scale, len / 3],
      [(Math.random() - 0.5) * 30 * scale, 2 * len / 3],
      [(Math.random() - 0.5) * 30 * scale, len],
    ];
  }
}

/** @type {HTMLCanvasElement | undefined} */
var canvas = null;
/** @type {Balloon[]} */
var balloons = [];
var burst_balloons = [];
var wind = 0;
var maxWindChange = 0.5;
var shoot = null;
var startTime = Date.now();
var lastSpawnTime = startTime;
var level = 1;
var lives = 3;
var score = 0;
var scoreboard = new ScoreBoard();
var balloons_hit = 0;
var window_width = 0;
var window_height = 0;
var scale = 0;
const gameTime = 60 * 1000;
const twoPi = Math.PI * 2;
var spawnTime = 2000;

/**
 * @param {any} ctx
 * @param {Balloon} balloon
 */
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
  let b = new Balloon(x, level);
  balloons.push(b);
}

function showScordBoard() {
  document.getElementById('high_scores').style.display = "block";
  canvas.style.display = "none";
  let newPosition = scoreboard.addScore("", score);
  scoreboard.saveScores();
  let scores = scoreboard.scores;

  let scores_rows = document.getElementById("high_score_table").children[0].children;

  for (let i = 0; i < scores.length; ++i) {
    let row = scores_rows[i];
    /** @type {HTMLTableCellElement} */
    let name_td = (row.children[1]);
    /** @type {HTMLTableCellElement} */
    let score_td = (row.children[2]);
    name_td.innerText = scores[i].name;
    score_td.innerText = scores[i].score.toString();
    if (i == newPosition) {
      name_td.contentEditable = "true";
      name_td.focus();
      row.classList.add("current_high_score");
    } else {
      name_td.contentEditable = "false";
      row.classList.remove("current_high_score");
    }
  }

  return newPosition;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function gameOver(ctx) {
  window.removeEventListener("keydown", shootListener);

  init();
}

function levelUp() {
  level++;
  spawnTime *= 0.9;
}

function run() {
  let ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let newBalloons = [];
  let current = null;
  let currentIndex = 0;
  let currentTime = Date.now();
  let currentTopY = 0;

  if (currentTime - spawnTime > lastSpawnTime) {
    spawnBalloon();
    lastSpawnTime = currentTime;
  }

  if (shoot != null) {
    for (let i = 0; i < balloons.length; ++i) {
      let balloon = balloons[i];
      if (balloon.text == shoot) {
        var topY = balloon.y - balloon.height * .8;
        if (current == null || topY < currentTopY) {
          current = balloon;
          currentIndex = i;
          currentTopY = topY;
        }
      }
    }
    shoot = null;
    if (current != null) {
      pop_sound.play();
      burst_balloons.push(new Explosion(current.x, current.y, current.color1));
      balloons.splice(currentIndex, 1);
      score += 10;
      balloons_hit++;
      if (balloons_hit % 10 == 0) {
        levelUp();
      }
    } else {
      score--;
      miss_sound.play();
    }
  }

  var now = Date.now();
  if (lives < 1) {
    game_over_sound.play();
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

  ctx.fillText("Lives: " + lives, canvas.width - 10, 0);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < balloons.length; ++i) {
    let balloon = balloons[i];
    drawBalloon(ctx, balloon);
    let localWind = wind * (1.2 - 0.4 * Math.random());
    balloon.x = Math.min(Math.max(balloon.x + localWind, balloon.width), canvas.width - balloon.width);
    balloon.y -= balloon.speed;
    if (balloon.y + balloon.height + balloon.string[2][1] > 0) {
      newBalloons.push(balloon);
    } else {
      lives--;
      lose_life_sound.play();
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

function firstInit() {
  canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
  init();
}

function init() {
  /**
   * @param {UIEvent} _ev
   * @returns {any}
   */
  function resizeListener(_ev) {
    window_width = window.innerWidth;
    window_height = window.innerHeight;
    scale = window_height / 1000;
  }

  window.addEventListener("resize", resizeListener, false);
  resizeListener(undefined);

  let newPosition = showScordBoard();

  let high_score_prompt = document.getElementById("high_score_prompt")
  if (newPosition >= 0) {
    high_score_prompt.innerText = "Enter Name for New High Score";
  } else {
    high_score_prompt.innerText = "Press Enter to Start";
  }

  /**
   * @param {KeyboardEvent} e
   */
  function enterListener(e) {
    if (e.code == 'Enter') {
      if (newPosition >= 0) {
        let name_row = document.getElementById("high_score_table").children[0].children[newPosition];
        /** @type {HTMLTableCellElement} */
        let name_td = (name_row.children[1]);
        scoreboard.setName(newPosition, name_td.innerText)
        name_td.contentEditable = "false";
        newPosition = -1;
        high_score_prompt.innerText = "Press Enter to Start";
      } else {
        gameInit();
        document.getElementById('high_scores').style.display = "none";
        canvas.style.display = "block";
        window.removeEventListener("keydown", enterListener);
      }
    }
  }

  window.addEventListener("keydown", enterListener, false);
}

/**
 * @param {KeyboardEvent} e
 */
function shootListener(e) {
  let digit = +e.key;
  if (!isNaN(digit) && !e.repeat) {
    shoot = digit;
  } else if (e.key == "Escape") {
    lives = 0;
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
  balloons_hit = 0;
  lives = 3;
  level = 1;
  spawnTime = 1000;

  window.addEventListener("keydown", shootListener, false);

  // Need to figure out a better way to do this but they go as far out as on my
  // MBP, although there is still some padding at the bottom of the window.
  canvas.width = window.innerWidth - 8;
  canvas.height = window.innerHeight - 16;

  pop_sound = new Sound('pop_sound');
  miss_sound = new Sound('miss_sound');
  lose_life_sound = new Sound('lose_life_sound');
  game_over_sound = new Sound('game_over_sound', 1.0)

  run();
}