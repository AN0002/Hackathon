// Flappy Bird Game with Study Questions
let bird;
let pipes = [];
let gameState = "start"; // 'start', 'playing', 'dead', 'question'
let score = 0;
let highScore = parseInt(localStorage.getItem("flappyHighScore")) || 0;
let gravity = 0.6;
let jumpForce = -12;
let pipeSpeed = 3;
let pipeGap = 200;
let currentQuestion = null;
let questionAnswered = false;
let gameStarted = false;
let gameSketch = null;
let particles = [];
let birdRotation = 0;
let scoreAnimation = 0;

// Initialize game when page loads
let gameInitialized = false;
let gameCheckInterval = null;

function initGame() {
  if (gameInitialized || gameCheckInterval) return;

  // Wait for p5.js to load
  gameCheckInterval = setInterval(() => {
    if (typeof p5 !== "undefined") {
      const gameSection = document.getElementById("flappy-bird");
      const gameCanvas = document.getElementById("game-canvas");
      if (gameSection && gameCanvas && !gameInitialized) {
        // Check if canvas already has a p5 instance
        if (gameCanvas.querySelector("canvas")) {
          gameInitialized = true;
          clearInterval(gameCheckInterval);
          gameCheckInterval = null;
          return;
        }

        // Remove any existing canvas
        gameCanvas.innerHTML = "";
        try {
          gameSketch = new p5(sketch);
          gameInitialized = true;
          clearInterval(gameCheckInterval);
          gameCheckInterval = null;
        } catch (error) {
          console.error("Error initializing game:", error);
        }
      }
    }
  }, 100);
}

document.addEventListener("DOMContentLoaded", () => {
  // Don't auto-initialize, wait for page navigation
});

// Export for app.js
window.initGame = initGame;

function sketch(p) {
  p.setup = function () {
    const canvas = p.createCanvas(400, 600);
    canvas.parent("game-canvas");

    bird = {
      x: 100,
      y: p.height / 2,
      velocity: 0,
      size: 30,
      color: [255, 200, 0],
      rotation: 0,
    };

    pipes = [];
    particles = [];
    score = 0;
    scoreAnimation = 0;
    birdRotation = 0;
    gameState = "start";
  };

  p.draw = function () {
    // Background - black with golden confetti effect
    p.background(10, 10, 10);

    // Add golden confetti particles
    for (let i = 0; i < 20; i++) {
      let x = (p.frameCount * 2 + i * 50) % p.width;
      let y = (p.frameCount * 1.5 + i * 30) % p.height;
      p.fill(255, 215, 0, 100);
      p.noStroke();
      p.ellipse(x, y, 3, 3);
    }

    if (gameState === "start") {
      drawStartScreen(p);
    } else if (gameState === "playing") {
      updateGame(p);
      drawGame(p);
    } else if (gameState === "dead") {
      drawGame(p);
      drawGameOver(p);
    } else if (gameState === "question") {
      drawGame(p);
    }
  };

  p.keyPressed = function () {
    if (p.key === " " || p.keyCode === p.UP_ARROW) {
      if (gameState === "start") {
        startGame();
      } else if (gameState === "playing") {
        bird.velocity = jumpForce;
      }
    }
  };

  p.mousePressed = function () {
    if (gameState === "start") {
      startGame();
    } else if (gameState === "playing") {
      bird.velocity = jumpForce;
    }
  };
}

function startGame() {
  gameState = "playing";
  gameStarted = true;
  bird.y = 300;
  bird.velocity = 0;
  pipes = [];
  score = 0;
  questionAnswered = false;
}

function updateGame(p) {
  // Update bird
  bird.velocity += gravity;
  bird.y += bird.velocity;

  // Animate bird rotation based on velocity
  birdRotation = p.constrain(bird.velocity * 2, -30, 30);

  // Check boundaries
  if (bird.y > p.height - bird.size / 2) {
    bird.y = p.height - bird.size / 2;
    gameOver();
  }
  if (bird.y < bird.size / 2) {
    bird.y = bird.size / 2;
    bird.velocity = 0;
  }

  // Update pipes
  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].x -= pipeSpeed;

    // Check collision
    if (checkCollision(bird, pipes[i], p)) {
      createParticles(bird.x, bird.y, p);
      gameOver();
      return;
    }

    // Score point
    if (!pipes[i].scored && pipes[i].x + pipes[i].width < bird.x) {
      pipes[i].scored = true;
      score++;
      scoreAnimation = 30;
      createScoreParticles(
        pipes[i].x + pipes[i].width / 2,
        pipes[i].topHeight + pipes[i].gap / 2,
        p
      );

      // Update high score
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("flappyHighScore", highScore);
      }
    }

    // Remove off-screen pipes
    if (pipes[i].x + pipes[i].width < 0) {
      pipes.splice(i, 1);
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].x += particles[i].vx;
    particles[i].y += particles[i].vy;
    particles[i].vy += 0.2; // gravity
    particles[i].life--;
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }

  // Animate score
  if (scoreAnimation > 0) {
    scoreAnimation--;
  }

  // Add new pipes
  if (
    pipes.length === 0 ||
    (pipes.length > 0 && pipes[pipes.length - 1].x < p.width - 300)
  ) {
    addPipeInSketch(p);
  }
}

function createParticles(x, y, p) {
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: x,
      y: y,
      vx: p.random(-3, 3),
      vy: p.random(-3, 3),
      life: 30,
      color: [255, 200, 0],
    });
  }
}

function createScoreParticles(x, y, p) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: x,
      y: y,
      vx: p.random(-2, 2),
      vy: p.random(-5, -2),
      life: 20,
      color: [255, 215, 0],
    });
  }
}

function addPipe() {
  const minHeight = 50;
  const maxHeight = 400;
  const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

  pipes.push({
    x: 400,
    topHeight: topHeight,
    gap: pipeGap,
    width: 60,
    scored: false,
  });
}

function addPipeInSketch(p) {
  const minHeight = 50;
  const maxHeight = 400;
  const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

  pipes.push({
    x: p.width,
    topHeight: topHeight,
    gap: pipeGap,
    width: 60,
    scored: false,
  });
}

function checkCollision(bird, pipe, p) {
  const birdLeft = bird.x - bird.size / 2;
  const birdRight = bird.x + bird.size / 2;
  const birdTop = bird.y - bird.size / 2;
  const birdBottom = bird.y + bird.size / 2;

  const pipeLeft = pipe.x;
  const pipeRight = pipe.x + pipe.width;
  const pipeTopBottom = pipe.topHeight;
  const pipeBottomTop = pipe.topHeight + pipe.gap;

  // Check if bird is in pipe's x range
  if (birdRight > pipeLeft && birdLeft < pipeRight) {
    // Check if bird hits top or bottom pipe
    if (birdTop < pipeTopBottom || birdBottom > pipeBottomTop) {
      return true;
    }
  }

  return false;
}

function drawGame(p) {
  // Draw pipes with gradient
  for (let pipe of pipes) {
    // Top pipe with gradient
    for (let i = 0; i < pipe.topHeight; i++) {
      let alpha = p.map(i, 0, pipe.topHeight, 255, 200);
      p.fill(34, 139 + i * 0.1, 34, alpha);
      p.noStroke();
      p.rect(pipe.x, i, pipe.width, 1);
    }
    p.fill(34, 139, 34);
    p.rect(pipe.x, 0, pipe.width, pipe.topHeight);

    // Bottom pipe with gradient
    let bottomY = pipe.topHeight + pipe.gap;
    for (let i = 0; i < p.height - bottomY; i++) {
      let alpha = p.map(i, 0, p.height - bottomY, 200, 255);
      p.fill(34, 139 + i * 0.1, 34, alpha);
      p.noStroke();
      p.rect(pipe.x, bottomY + i, pipe.width, 1);
    }
    p.fill(34, 139, 34);
    p.rect(pipe.x, bottomY, pipe.width, p.height - bottomY);

    // Pipe caps
    p.fill(20, 100, 20);
    p.rect(pipe.x - 5, pipe.topHeight - 20, pipe.width + 10, 20);
    p.rect(pipe.x - 5, bottomY, pipe.width + 10, 20);
  }

  // Draw particles
  for (let particle of particles) {
    p.fill(
      particle.color[0],
      particle.color[1],
      particle.color[2],
      particle.life * 8
    );
    p.noStroke();
    p.ellipse(particle.x, particle.y, 4, 4);
  }

  // Draw bird with rotation
  p.push();
  p.translate(bird.x, bird.y);
  p.rotate(p.radians(birdRotation));

  // Bird body
  p.fill(bird.color[0], bird.color[1], bird.color[2]);
  p.ellipse(0, 0, bird.size, bird.size);

  // Animated wings
  let wingOffset = p.sin(p.frameCount * 0.3) * 3;
  p.fill(255, 150, 0);
  p.ellipse(-5 + wingOffset, 0, 15, 10);

  // Eye
  p.fill(0);
  p.ellipse(8, -5, 5, 5);
  p.fill(255);
  p.ellipse(9, -6, 2, 2);

  p.pop();

  // Draw score with animation
  p.fill(255, 215, 0);
  p.textSize(48 + scoreAnimation);
  p.textAlign(p.CENTER);
  p.textStyle(p.BOLD);
  p.text(score, p.width / 2, 60);

  // Draw high score
  if (highScore > 0) {
    p.fill(255, 255, 255, 150);
    p.textSize(16);
    p.textStyle(p.NORMAL);
    p.text(`Best: ${highScore}`, p.width / 2, 85);
  }
}

function drawStartScreen(p) {
  // Animated title
  let titleY = p.height / 2 - 50 + p.sin(p.frameCount * 0.05) * 5;
  p.fill(255, 215, 0);
  p.textSize(48);
  p.textAlign(p.CENTER);
  p.textStyle(p.BOLD);
  p.text("Flappy Bird", p.width / 2, titleY);

  p.fill(255);
  p.textSize(20);
  p.textStyle(p.NORMAL);
  p.text("Click or Press Space to Start", p.width / 2, p.height / 2 + 30);

  p.fill(200);
  p.textSize(16);
  p.text("Answer questions when you die!", p.width / 2, p.height / 2 + 60);

  // Show high score
  if (highScore > 0) {
    p.fill(255, 215, 0);
    p.textSize(18);
    p.text(`High Score: ${highScore}`, p.width / 2, p.height / 2 + 90);
  }
}

function drawGameOver(p) {
  p.fill(0, 0, 0, 200);
  p.rect(0, 0, p.width, p.height);

  p.fill(255, 215, 0);
  p.textSize(42);
  p.textAlign(p.CENTER);
  p.textStyle(p.BOLD);
  p.text("Game Over!", p.width / 2, p.height / 2 - 80);

  p.fill(255);
  p.textSize(28);
  p.textStyle(p.NORMAL);
  p.text(`Score: ${score}`, p.width / 2, p.height / 2 - 30);

  if (score === highScore && score > 0) {
    p.fill(255, 215, 0);
    p.textSize(20);
    p.text("NEW HIGH SCORE!", p.width / 2, p.height / 2 + 10);
  } else if (highScore > 0) {
    p.fill(200);
    p.textSize(18);
    p.text(`High Score: ${highScore}`, p.width / 2, p.height / 2 + 10);
  }

  if (!questionAnswered && gameState === "dead") {
    p.fill(255, 255, 255, 150);
    p.textSize(16);
    p.text("Loading question...", p.width / 2, p.height / 2 + 50);
    // Show question after a short delay
    setTimeout(() => {
      if (!questionAnswered) {
        showQuestion();
      }
    }, 500);
  }
}

function gameOver() {
  gameState = "dead";
  questionAnswered = false;
  showQuestion();
}

function showQuestion() {
  if (questionAnswered) return;

  // Get study material from flashcards or notes
  const flashcards = JSON.parse(localStorage.getItem("flashcards")) || [];
  const notes = JSON.parse(localStorage.getItem("notes")) || [];

  // Generate question from flashcards if available
  if (flashcards.length > 0) {
    const randomCard =
      flashcards[Math.floor(Math.random() * flashcards.length)];

    // Generate wrong answers from other flashcards
    const wrongAnswers = flashcards
      .filter((c, i) => c.front !== randomCard.front)
      .map((c) => c.back)
      .slice(0, 3);

    // If not enough flashcards, add generic wrong answers
    while (wrongAnswers.length < 3) {
      wrongAnswers.push("Incorrect answer");
    }

    // Shuffle options
    const allOptions = [randomCard.back, ...wrongAnswers];
    const shuffled = [...allOptions].sort(() => Math.random() - 0.5);
    const correctIndex = shuffled.indexOf(randomCard.back);

    currentQuestion = {
      question: `What is the answer to: "${randomCard.front}"?`,
      options: shuffled,
      correct: correctIndex,
    };
  } else if (notes.length > 0) {
    // Generate question from notes
    const randomNote = notes[Math.floor(Math.random() * notes.length)];
    const noteContent = randomNote.content || "";

    // Extract key concept from note
    const words = noteContent.split(" ").filter((w) => w.length > 4);
    const keyConcept =
      words[Math.floor(Math.random() * words.length)] || "the main topic";

    const correctAnswer = noteContent.substring(0, 60).trim() || keyConcept;
    const wrongAnswers = [
      "This is not mentioned in your notes",
      "Your notes describe this differently",
      "This concept is unclear in your notes",
    ];

    // Shuffle options
    const allOptions = [correctAnswer, ...wrongAnswers];
    const shuffled = [...allOptions].sort(() => Math.random() - 0.5);
    const correctIndex = shuffled.indexOf(correctAnswer);

    currentQuestion = {
      question: `Based on your notes, what does the material say about "${keyConcept}"?`,
      options: shuffled,
      correct: correctIndex,
    };
  } else {
    // Default question
    const allOptions = ["4", "3", "5", "6"];
    const shuffled = [...allOptions].sort(() => Math.random() - 0.5);
    const correctIndex = shuffled.indexOf("4");

    currentQuestion = {
      question: "What is 2 + 2?",
      options: shuffled,
      correct: correctIndex,
    };
  }

  // Show question modal
  displayQuestionModal();
}

function displayQuestionModal() {
  if (!currentQuestion) return;

  const modal = document.getElementById("question-modal");
  const questionText = document.getElementById("question-text");
  const questionOptions = document.getElementById("question-options");

  questionText.textContent = currentQuestion.question;
  questionOptions.innerHTML = "";

  currentQuestion.options.forEach((option, index) => {
    const optionDiv = document.createElement("div");
    optionDiv.className = "test-option";
    optionDiv.textContent = option;
    optionDiv.setAttribute("data-index", index);
    optionDiv.addEventListener("click", () => selectQuestionAnswer(index));
    questionOptions.appendChild(optionDiv);
  });

  modal.classList.add("active");
  gameState = "question";
}

function selectQuestionAnswer(index) {
  // Remove previous selections
  document.querySelectorAll("#question-options .test-option").forEach((opt) => {
    opt.classList.remove("selected");
  });

  // Select new answer
  const options = document.querySelectorAll("#question-options .test-option");
  if (options[index]) {
    options[index].classList.add("selected");
  }
  selectedAnswer = index;
}

function submitAnswer() {
  if (selectedAnswer === null) {
    alert("Please select an answer");
    return;
  }

  const modal = document.getElementById("question-modal");
  const isCorrect = selectedAnswer === currentQuestion.correct;

  if (isCorrect) {
    alert("Correct! Restarting game...");
    questionAnswered = true;
    modal.classList.remove("active");
    resetGame();
  } else {
    alert(
      "Incorrect! The correct answer is: " +
        currentQuestion.options[currentQuestion.correct] +
        "\nTry again!"
    );
    // Reset selection
    selectedAnswer = null;
    document
      .querySelectorAll("#question-options .test-option")
      .forEach((opt) => {
        opt.classList.remove("selected");
      });
  }
}

function resetGame() {
  gameState = "start";
  if (bird) {
    bird.y = 300;
    bird.velocity = 0;
  }
  pipes = [];
  score = 0;
  questionAnswered = false;
  currentQuestion = null;
  selectedAnswer = null;
  gameStarted = false;
}

// Export functions for HTML
window.submitAnswer = submitAnswer;
