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

    setEnabled: function(enabled)
    {
      console.log(this.main.id);

      this.main.disabled = !enabled;
      this.onMobile.disabled = !enabled;

      //if(enabled)
      //{
      //  this.main.removeAttribute("disabled");
      //  this.onMobile.removeAttribute("disabled");
      //}
      //else
      //{
      //  this.main.setAttribute("disabled", true);
      //  this.onMobile.setAttribute("disabled", true);
      //}
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

  // Audio
  music: new Audio("audio/lobby_time.mp3", { loop: true }),
  musicEnabled: true,
  enableMusic: function(enabled)
  {
    if(enabled)
    {
      this.music.muted = false;
      //this.music.play();
      this.btn_music.setText("Music: On", "music_note");
    }
    else
    {
      this.music.muted = true;
      //this.music.pause();
      this.btn_music.setText("Music: Off", "music_off");
    }

    this.musicEnabled = enabled;
  },

  sounds: {
    pop: new Audio("audio/260614__kwahmah_02__pop.wav"),

    play: function(soundName)
    {
      if(gameHTML.soundEnabled)
      {
        this[soundName].currentTime = 0; // Rewind to allow quick retriggering
        this[soundName].play();
      }
    }
  },
  soundEnabled: true,
  enableSound: function(enabled)
  {
    if(enabled)
    {
      this.btn_sound.setText("Sound: On", "brand_awareness");
    }
    else
    {
      this.btn_sound.setText("Sound: Off", "volume_mute");
    }

    this.soundEnabled = enabled;
  },

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
  btn_credits: defineControl("credits-btn"),

  btn_music: defineControl("music-toggle"),
  btn_sound: defineControl("sound-toggle"),

  enableGameControlButtons: function(enabled)
  {
    this.btn_restart.setEnabled(enabled);
    this.btn_pause.setEnabled(enabled);
  },

  // Overlays
  overlay_start: document.getElementById("start-game-overlay"),
  overlay_pause: document.getElementById("pause-overlay"),
  overlay_credits: document.getElementById("credits-overlay"),

  setOverlayState: function(overlayName, visible, newMessage)
  {
    root.style.setProperty(`--${overlayName}-overlay-display`, visible ? "flex" : "none");
    if(visible && newMessage !== undefined)
    {
      this["overlay_"+overlayName].textContent = newMessage;
    }
  },

  // Message
  game_message: document.getElementById("game-message"),
  msg_timeout: null,
  showMessage: function(message)
  {
    this.game_message.textContent = message;
    if(this.game_message.classList.contains("display"))
    {
      this.game_message.classList.remove("display"); // Restart animation if already active
      void this.game_message.offsetWidth; // Force reflow to allow animation restart
    }
    this.game_message.classList.add("display");
    
    // Reset timeout for message display class removal
    if(this.msg_timeout != null)
      clearTimeout(this.msg_timeout);
    this.msg_timeout = setTimeout(() => {
      this.game_message.classList.remove("display");
    }, 2000);
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
    const dropDuration = gameState.drop_time_base + (Math.random() * gameState.drop_time_offset);
    drop.style.animationDuration = dropDuration + "s";

    // Add the new drop to the game screen
    document.getElementById("game-container").appendChild(drop);

    // Remove drops on click and handle it accordingly
    drop.addEventListener("click", () => {
      if(!gameState.active)
        return;

      drop.remove();
      gameHTML.sounds.play("pop");
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
  combo_max: 9,

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
    gameHTML.enableGameControlButtons(newState != "new");

    if(newState != "credits")
      gameHTML.setOverlayState("credits", false);

    if(newState != "paused")
    {
      gameHTML.setOverlayState("pause", false);
      gameHTML.btn_pause.setText("Pause Game", "pause");
    }

    // State-specific changes
    switch(newState)
    {
      case "new":
        if(this.currentState == "playing")
          gameHTML.setDropMaker(false);
        
        gameHTML.setOverlayState("start", true);
        gameHTML.btn_credits.setEnabled(true);
        this.active = false;
        break;
        
      case "started":
        gameHTML.clearDrops();
        gameHTML.setOverlayState("start", false);

        this.scoreMsgCounter = 0;
        this.update_value("score", 0);
        this.update_value("combo", 0);
        this.update_value("purity", 100);
        gameHTML.btn_credits.setEnabled(false);
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

        gameHTML.btn_pause.setEnabled(false);
        gameHTML.btn_credits.setEnabled(true);
        this.active = false;
        break;

      case "credits":
        gameHTML.setOverlayState("pause", false);
        gameHTML.setOverlayState("credits", true);
        gameHTML.setOverlayState("start", false);
        gameHTML.setDropMaker(false);

        gameHTML.btn_restart.setEnabled(true);
        gameHTML.btn_pause.setEnabled(false);
        gameHTML.btn_credits.setEnabled(false);
        this.active = false;
        break;
    }

    console.log(`State updated from ${this.currentState} to ${newState}.`);
    this.currentState = newState;

    if(this.currentState == "started")
      this.changeState("playing");
  },

  scoreMsgCounter: 0,
  collectPureDroplet: function(pts)
  {
    let ptsToAdd = pts * (this.combo + 1);
    this.update_value("score", this.score + ptsToAdd);
    switch(this.scoreMsgCounter)
    {
      case 0:
        if(this.score >= 500)
        {
          gameHTML.showMessage("Keep it up!");
          this.scoreMsgCounter++;
        }
        break;
      case 1:
        if(this.score >= 1000)
        {
          gameHTML.showMessage("Great job!");
          this.scoreMsgCounter++;
        }
        break;
      case 2:
        if(this.score >= 2000)
        {
          gameHTML.showMessage("Amazing!");
          this.scoreMsgCounter++;
        }
        break;
      default:
        if(this.score >= 2000 * (this.scoreMsgCounter - 2))
        {
          gameHTML.showMessage("Awesome!");
          this.scoreMsgCounter++;
        }
        break;
    }

    if(this.combo < this.combo_max)
    {
      this.update_value("combo", this.combo + 1);
      if(this.combo == this.combo_max)
        gameHTML.showMessage("Combo Max!");
    }
    if(this.purity < 100)
    {
      this.update_value("purity", this.purity + this.pure_purity_bonus);
      if(this.purity >= 100)
        gameHTML.showMessage("Purity Restored!");
    }
  },

  collectImpureDroplet: function()
  {
    if(this.combo != 0)
    {
      this.update_value("combo", 0);
      if(this.combo >= 5)
        gameHTML.showMessage("Combo Broken!");
    }

    this.update_value("purity", Math.max(0, this.purity - this.impure_purity_penalty));
    this.update_value("score", Math.max(0, this.score - this.impure_score_penalty));

    if(gameState.purity <= 0)
    {
      gameState.changeState("gameover");
    }
    else if(gameState.purity >= 0 && gameState.purity <= 20)
      gameHTML.showMessage("Watch out!");
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
        gameState.spawn_rate = 800;
        gameState.impure_purity_penalty = 6;
        gameState.impure_score_penalty = 1;
        gameState.pure_purity_bonus = 2;
        gameState.drop_time_base = 4;
        gameState.drop_time_offset = 0.5;
        gameState.drop_impure_chance = 0.3;
        gameState.combo_max = 20;
      break;

    case "medium":
      gameState.spawn_rate = 600;
      gameState.impure_purity_penalty = 12;
      gameState.impure_score_penalty = 5;
      gameState.pure_purity_bonus = 1;
      gameState.drop_time_base = 2;
      gameState.drop_time_offset = 2;
      gameState.drop_impure_chance = 0.5;
      gameState.combo_max = 10;
      break;

    case "hard":
      gameState.spawn_rate = 400;
      gameState.impure_purity_penalty = 20;
      gameState.impure_score_penalty = 10;
      gameState.pure_purity_bonus = 0;
      gameState.drop_time_base = 0.75;
      gameState.drop_time_offset = 1.5;
      gameState.drop_impure_chance = 0.75;
      gameState.combo_max = 5;
      break;
  }

  gameState.changeState("started");
  gameHTML.music.play();
}

// Allow player to restart game
gameHTML.btn_restart.addEventListener("click", () => gameState.changeState("new"));

// Allow player to click button to toggle pausing the game
gameHTML.btn_pause.addEventListener("click", pauseGame);
function pauseGame() {
  if (!gameState.active) return;
  gameState.changeState(gameState.currentState == "paused" ? "playing" : "paused");
}

// Allow player to click button to view credits
gameHTML.btn_credits.addEventListener("click", () => gameState.changeState("credits"));

// Allow player to toggle music
gameHTML.btn_music.addEventListener("click", () => gameHTML.enableMusic(!gameHTML.musicEnabled));

// Allow player to toggle sound effects
gameHTML.btn_sound.addEventListener("click", () => gameHTML.enableSound(!gameHTML.soundEnabled));

gameHTML.music.onloadeddata = function() {
  gameHTML.enableMusic(true);
  
};