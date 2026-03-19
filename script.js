// Variables to control game state
const root = document.documentElement; // For CSS variables
let gameRunning = false; // Keeps track of whether game is active or not
let gameState = {
  score: 0,
  combo: 0,
  purity: 100,

  span_score: document.getElementById("score"),
  span_combo: document.getElementById("combo"),
  span_purity: document.getElementById("purity"),

  paused: false,
  dropMaker: null, // Will store our timer that creates drops regularly
  div_overlay: document.getElementById("game-overlay").childNodes[1], // The h1 element inside the overlay div

  update_value: function(id, value)
  {
    // Update the variable to have the new value
    this[id] = value;
    // Update the HTML span to use the variable's new value
    this["span_"+id].textContent = value;
  },

  reset: function()
  {
    this.update_value("score", 0);
    this.update_value("combo", 0);
    this.update_value("purity", 100);
    
    if(this.paused)
      this.setPauseState(false);
    else
      this.setOverlayState(false); // Avoid calling setOverlayState twice

    // Force drop maker to reset interval
    this.setDropMakerState(false);
    this.setDropMakerState(true);
  },

  collectPureDroplet: function(pts)
  {
    let ptsToAdd = pts * (this.combo + 1);
    this.update_value("score", this.score + ptsToAdd);

    if(this.combo < 9)
    {
      this.update_value("combo", this.combo + 1);
    }
    if(this.purity < 100)
    {
      this.update_value("purity", this.purity + 2);
    }
  },

  collectImpureDroplet: function()
  {
    if(this.combo != 0)
    {
      this.update_value("combo", 0);
    }

    this.update_value("purity", Math.max(0, this.purity - 12));
    this.update_value("score", Math.max(0, this.score - 5));
  },

  setPauseState: function(isPaused, message)
  {
    if(this.paused == isPaused)
      return;

    if(isPaused)
    {
      this.paused = true;
      root.style.setProperty("--anim-play", "paused");
      this.setDropMakerState(false);
      this.setOverlayState(true, message);
    }
    else
    {
      this.paused = false;
      root.style.setProperty("--anim-play", "running");
      this.setDropMakerState(true);
      this.setOverlayState(false);
    }
  },

  setDropMakerState: function(enabled)
  {
    if(enabled && this.dropMaker == null)
    {
      this.dropMaker = setInterval(createDrop, 1000);
    }
    else if(!enabled && this.dropMaker != null)
    {
      clearInterval(this.dropMaker);
      this.dropMaker = null;
    }
  },

  setOverlayState: function(visible, message)
  {
    if(visible)
    {
      root.style.setProperty("--overlay-display", "flex");
      if(message !== undefined)
        this.div_overlay.textContent = message;
    }
    else
    {
      root.style.setProperty("--overlay-display", "none");
    }
  }
};

// Wait for button click to start the game
let startButton = document.getElementById("start-btn");
let startButtonMb = document.getElementById("start-btn-mb");
startButton.addEventListener("click", startGame);
startButtonMb.addEventListener("click", startGame);

function startGame() {
  document.querySelectorAll(".water-drop").forEach(drop => drop.remove());

  // Change labels of start buttons
  startButton.textContent = "Restart Game";
  startButtonMb.textContent = "Restart";

  gameRunning = true;
  gameState.reset();
}

// Allow player to click button to toggle pausing the game
let pauseButton = document.getElementById("pause-btn");
let pauseButtonMb = document.getElementById("pause-btn-mb");

pauseButton.addEventListener("click", pauseGame);
pauseButtonMb.addEventListener("click", pauseGame);

function pauseGame() {
  // Prevent multiple games from running at once
  if (!gameRunning) return;

  // Toggle the pause state
  gameState.setPauseState(!gameState.paused, "Paused");

  // Change labels of pause buttons
  if(gameState.paused)
  {
    pauseButton.textContent = "Resume Game";
    pauseButtonMb.textContent = "Resume";
  }
  else
  {
    pauseButton.textContent = "Pause Game";
    pauseButtonMb.textContent = "Pause";
  }

}

function createDrop() {
  var dropType = Math.random() < 0.6 ? "pure" : "impure";

  // Create a new div element that will be our water drop
  const drop = document.createElement("div");
  drop.className = "water-drop " + dropType;

  // Make drops different sizes for visual variety
  const initialSize = 60;
  const sizeMultiplier = Math.random() * 0.8 + 0.5;
  const size = initialSize * sizeMultiplier;
  drop.style.width = drop.style.height = `${size}px`;

  // Position the drop randomly across the game width
  // Subtract 60 pixels to keep drops fully inside the container
  const gameWidth = document.getElementById("game-container").offsetWidth;
  const xPosition = Math.random() * (gameWidth - 60);
  drop.style.left = xPosition + "px";

  // Make drops fall for 2-4 seconds
  const dropDuration = 2 + (Math.random() * 2);
  drop.style.animationDuration = dropDuration + "s";

  // Add the new drop to the game screen
  document.getElementById("game-container").appendChild(drop);

  // Remove drops on click and handle it accordingly
  drop.addEventListener("click", () => {
    if(gameState.paused)
      return;

    drop.remove();
    if(drop.classList.contains("impure"))
    {
      gameState.collectImpureDroplet();
      if(gameState.purity <= 0)
      {
        gameState.setPauseState(true, "Game Over");
        gameRunning = false;
      }
    }
    else
    {
      gameState.collectPureDroplet(10);
    }
  });

  // Remove drops that reach the bottom (weren't clicked)
  drop.addEventListener("animationend", () => {
    drop.remove(); // Clean up drops that weren't caught
  });
}
