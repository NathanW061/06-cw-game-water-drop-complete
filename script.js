// Variables to control game state
const root = document.documentElement; // For CSS variables

function defineControl(id)
{
  return {
    main: document.getElementById(id),
    onMobile: document.getElementById(id+"-mb"),

    addEventListener: function(event, handler)
    {
      this.main.addEventListener(event, handler);
      this.onMobile.addEventListener(event, handler);
    },

    setAttribute: function(attr, value)
    {
      this.main.setAttribute(attr, value);
      this.onMobile.setAttribute(attr, value);
    },

    setText: function(mainTxt, mobileIcon)
    {
      this.main.textContent = mainTxt;
      this.onMobile.childNodes[0].textContent = mobileIcon;
    }
  };
}

// Object used to manage the HTML and CSS side of the game
let gameHTML = {

  // HTML span references
  span_score: document.getElementById("score"),
  span_combo: document.getElementById("combo"),
  span_purity: document.getElementById("purity"),

  updateSpan: function(id, value)
  {
    this["span_"+id].textContent = value;
  },

  // UI Buttons
  btn_restart: defineControl("restart-btn"),
  btn_pause: defineControl("pause-btn"),

  enableGameControlButtons: function(enabled)
  {
    this.btn_restart.setAttribute("disabled", enabled);
    this.btn_pause.setAttribute("disabled", enabled);
  },

  // Overlays
  overlay_start: document.getElementById("start-game-overlay"),
  overlay_pause: document.getElementById("pause-overlay"),

  setOverlayState: function(overlayName, visible, newMessage)
  {
    root.style.setProperty(`--${overlayName}-overlay-display`, visible ? "flex" : "none");
    if(visible && newMessage !== undefined)
    {
      this["overlay_"+overlayName].textContent = newMessage;
    }
  },

  // Drops
  dropMaker: null,

  setDropMaker: function(enabled, rate)
  {
    if(enabled && this.dropMaker == null)
    {
      this.dropMaker = setInterval(this.createDrop, rate);
    }
    else if(!enabled && this.dropMaker != null)
    {
      clearInterval(this.dropMaker);
      this.dropMaker = null;
    }
  },
  createDrop: function() {
    var dropType = Math.random() < gameState.drop_impure_chance ? "impure" : "pure";

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
    const dropDuration = gameState.drop_time_base + (Math.random() * (gameState.drop_time_offset - gameState.drop_time_base));
    drop.style.animationDuration = dropDuration + "s";

    // Add the new drop to the game screen
    document.getElementById("game-container").appendChild(drop);

    // Remove drops on click and handle it accordingly
    drop.addEventListener("click", () => {
      if(!gameState.active)
        return;

      drop.remove();
      if(drop.classList.contains("impure"))
      {
        gameState.collectImpureDroplet();
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
  },

  resetDropMaker: function(rate)
  {
    if(this.dropMaker != null)
      clearInterval(this.dropMaker);
    this.dropMaker = setInterval(createDrop, rate);
  },

  setDropMovement: function(active)
  {
    root.style.setProperty("--anim-play", active ? "running" : "paused");
  },

  clearDrops: function()
  {
    document.querySelectorAll(".water-drop").forEach(drop => drop.remove());
  }
};

// Object used to manage the game state and logic
let gameState = {
  score: 0,
  combo: 0,
  purity: 100,

  // Difficulty-based settings
  spawn_rate: 1000,
  impure_purity_penalty: 12,
  impure_score_penalty: 5,
  pure_purity_bonus: 2,
  drop_time_base: 2,
  drop_time_offset: 2,
  drop_impure_chance: 0.6,

  currentState: "new",
  active: false, // Keeps track of whether game is active or not

  update_value: function(id, value)
  {
    this[id] = value;
    gameHTML.updateSpan(id, value);
  },

  changeState: function(newState)
  {
    if(this.currentState == newState)
      return;

    // State-exclusive changes
    gameHTML.enableGameControlButtons(newState == "new");

    if(this.currentState == "paused")
    {
      gameHTML.setOverlayState("pause", false);
      gameHTML.btn_pause.setText("Pause Game", "pause");
    }

    // State-specific changes
    switch(newState)
    {
      case "new":
        gameHTML.setOverlayState("start", true);
        this.active = false;
        break;
        
      case "started":
        gameHTML.clearDrops();

        this.update_value("score", 0);
        this.update_value("combo", 0);
        this.update_value("purity", 100);
        break;
          
      case "playing":
        gameHTML.setOverlayState("pause", false);
        gameHTML.setDropMaker(true, this.spawn_rate);
        gameHTML.setDropMovement(true);

        this.active = true;
        break;

      case "paused":
        gameHTML.setOverlayState("pause", true, "Paused");
        gameHTML.setDropMaker(false);
        gameHTML.setDropMovement(false);

        gameHTML.btn_pause.setText("Resume Game", "play_arrow");
        break;

      case "gameover":
        gameHTML.setOverlayState("pause", true, "Game Over");
        gameHTML.setDropMaker(false);

        gameHTML.pauseButton.setAttribute("disabled", true);
        this.active = false;
        break;
    }

    console.log(`State updated from ${this.currentState} to ${newState}.`);
    this.currentState = newState;

    if(this.currentState == "started")
      this.changeState("playing");
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
      this.update_value("purity", this.purity + this.pure_purity_bonus);
    }
  },

  collectImpureDroplet: function()
  {
    if(this.combo != 0)
    {
      this.update_value("combo", 0);
    }

    this.update_value("purity", Math.max(0, this.purity - this.impure_purity_penalty));
    this.update_value("score", Math.max(0, this.score - this.impure_score_penalty));

    if(gameState.purity <= 0)
    {
      gameState.changeState("gameover");
    }
  }
};

// Set difficulty settings and start game when clicking a difficulty button
document.getElementById("start-easy").addEventListener("click", () => startGame("easy"));
document.getElementById("start-medium").addEventListener("click", () => startGame("medium"));
document.getElementById("start-hard").addEventListener("click", () => startGame("hard"));

function startGame(difficulty)
{
  switch(difficulty)
  {
    case "easy":
        gameState.spawn_rate = 1200;
        gameState.impure_purity_penalty = 6;
        gameState.impure_score_penalty = 1;
        gameState.pure_purity_bonus = 2;
        gameState.drop_time_base = 4;
        gameState.drop_time_offset = 0.5;
      break;

    case "medium":
      gameState.spawn_rate = 1000;
      gameState.impure_purity_penalty = 12;
      gameState.impure_score_penalty = 5;
      gameState.pure_purity_bonus = 1;
      gameState.drop_time_base = 2;
      gameState.drop_time_offset = 2;
      break;

    case "hard":
      gameState.spawn_rate = 600;
      gameState.impure_purity_penalty = 20;
      gameState.impure_score_penalty = 10;
      gameState.pure_purity_bonus = 0;
      gameState.drop_time_base = 1.5;
      gameState.drop_time_offset = 1.5;
      break;
  }

  gameState.changeState("started");
}

// Allow player to restart game
gameHTML.btn_restart.addEventListener("click", () => gameState.changeState("new"));

// Allow player to click button to toggle pausing the game
gameHTML.btn_pause.addEventListener("click", pauseGame);
function pauseGame() {
  if (!gameState.active) return;
  gameState.changeState(gameState.currentState == "paused" ? "playing" : "paused");
}

//let restartButton = document.getElementById("restart-btn");
//let restartButtonMb = document.getElementById("restart-btn-mb");
//restartButton.addEventListener("click", resetGame);
//restartButtonMb.addEventListener("click", resetGame);
//
//let pauseButton = document.getElementById("pause-btn");
//let pauseButtonMb = document.getElementById("pause-btn-mb");
//
//
//
//
//
//pauseButton.addEventListener("click", pauseGame);
//pauseButtonMb.addEventListener("click", pauseGame);
//
//
//
//
