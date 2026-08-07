/* =============================================================
   BIRTHDAY SITE — SCRIPT
   Part 1: Countdown logic only. Later parts will add the lights
   switch, party scene, cake/candle, letter, and final memory —
   their config blocks are reserved below so this file stays the
   single source of truth for editable values.
   ============================================================= */

/* -------------------------------------------------------------
   CONFIGURATION
   Edit the values in this block to customize the site.
   ------------------------------------------------------------- */
const CONFIG = {
  // Target birthday date & time the countdown counts down to.
  // Format: 'YYYY-MM-DDTHH:MM:SS' (interpreted in the visitor's
  // local timezone). Change this single value to move the date.
  TARGET_DATE: "2026-08-10T00:00:00",

  // Editable asset paths. Add to this object as later parts
  // introduce more images/sounds/music — keeps every path in one
  // easy-to-edit place.
  ASSETS: {
    switchSound: "assets/switch.mp3",
    blowSound: "assets/blow.mp3",
    music: "assets/music.mp3",
    photo: "assets/photo.jpg",
    countdownTick: "assets/tick.mp3", // Part 1's opening countdown, ticks every second
    countdownMusic: "assets/countdown-music.mp3", // Part 1's opening countdown, ambient loop
    wishTick: "assets/wish-tick.mp3", // Part 6's 3-2-1 "Make a wish" countdown
  },

  // Editable timing values (all in milliseconds), grouped here so
  // pacing can be tuned without hunting through the logic below.
  TIMINGS: {
    blackScreenFadeMs: 1400, // how long the fade-to-black transition takes
    lightsOnDurationMs: 1000, // how long the "gradually light the room" effect takes
    sceneRevealDelayMs: 900, // pause after the party scene starts fading in, before the lit screen starts dissolving away
    modeScreenFadeOutMs: 1800, // how long that final dissolve takes (must match the .scene-revealed CSS transition)
    wishMessageDurationMs: 3000, // how long "Make a wish..." shows before the 3-2-1 countdown starts
    wishCountdownStepMs: 1500, // how long each of 3 / 2 / 1 stays on screen
    blowOutAnimMs: 1500, // how long the flame-out + smoke animation runs before handing off
    letterRevealDelayMs: 3000, // pause after the celebration kicks in before the letter card fades in
    typewriterCharMs: 100, // how long each typed character takes to appear
    typewriterLinePauseMs: 1100, // pause between one line finishing and the next one starting
    letterFadeOutMs: 2000, // how long the letter card takes to fade away once it's finished
    memoryRevealDelayMs: 400, // pause after the letter is gone before the photo starts fading in
  },

  // Editable decoration values for the party scene (Part 4). The
  // fixed decorations (balloons, fairy lights, bunting, sparkles)
  // live directly in index.html/style.css; confetti is generated
  // at runtime, so its variety and volume are configurable here.
  DECOR: {
    confettiColors: [
      "#FFB8D2", // blush deep
      "#F0B94D", // gold
      "#D6C6F5", // lavender deep
      "#FFF8F0", // cream
      "#F7D796", // gold soft
    ],
    initialConfettiCount: 40,
    confettiFallDurationRange: [4, 8], // seconds, min/max
    confettiFallDelayRange: [0, 6], // seconds, min/max (negative offsets so pieces start mid-fall)
    confettiSizeRange: [6, 12], // pixels, min/max

    // Celebration (Part 7): extra decoration spawned once the
    // candle is blown out, on top of what's already in the scene.
    celebrationConfettiCount: 60,
    celebrationBalloonCount: 6,
    balloonColors: [
      "#FFD7E6", // blush
      "#FFB8D2", // blush deep
      "#F7D796", // gold soft
      "#D6C6F5", // lavender deep
      "#FBEEDF", // cream deep
      "#F2678F", // raspberry — echoes the cake for a festive pop
    ],
    balloonSizeRange: [38, 62], // pixels, width min/max (height follows at ~1.24x)
    balloonFloatDurationRange: [5, 8], // seconds, min/max
    balloonFloatDelayRange: [0, 3], // seconds, min/max (negative offsets so pieces start mid-float)
  },

  // Editable text content. The wish sequence (Part 6), birthday
  // letter (Part 8), and final photo caption (Part 9) are all
  // implemented below, so this stays the single place to edit copy.
  MESSAGES: {
    wishText: "Blow the candle and make a wish...",
    wishCountdownSteps: ["3", "2", "1"],

    // Each string becomes its own typed-out line in the letter card.
    // Keep lines reasonably short so they read comfortably on mobile.
    letterLines: [
      "I don't think a simple Happy Birthday could ever express everything I want to say so I made this little surprise instead So… Happy Birthday to the most inspiring and incredible person I know \u2764\uFE0F",
      "I hope this year brings you endless smiles, unforgettable memories and every dream your heart holds",
      "and brings you the same happiness you've brought into my life",
      "Keep shining, keep dreaming, and never lose your beautiful smile.",
      "\u2764\uFE0F ديماً فخور بيكي. ",
      "Have the most wonderful birthday ever! \u{1F382} \u{2728} \u{1F60D}",
    ],

    // Shown beneath the final photo.
    caption:
      "متفتكريش يعني عشان بقي عندك 21 سنة بقيتي كبيرة لسة بشوفك كده\u00A0\u200F\u{1F90F}\u{1F3FB}",
  },
};

/* -------------------------------------------------------------
   COUNTDOWN — STATE & ELEMENT REFERENCES
   ------------------------------------------------------------- */
const countdownEls = {
  screen: document.getElementById("countdown-screen"),
  days: document.getElementById("count-days"),
  hours: document.getElementById("count-hours"),
  minutes: document.getElementById("count-minutes"),
  seconds: document.getElementById("count-seconds"),
};

// Cache of previously rendered values, used to only trigger the
// little "tick" pulse animation on units that actually changed.
const previousValues = {
  days: null,
  hours: null,
  minutes: null,
  seconds: null,
};

let countdownIntervalId = null;

/* -------------------------------------------------------------
   BIRTHDAY MODE — STATE & ELEMENT REFERENCES
   ------------------------------------------------------------- */
const birthdayModeEls = {
  screen: document.getElementById("birthday-mode-screen"),
  lightsButton: document.getElementById("lights-button"),
  lightsOverlay: document.getElementById("lights-overlay"),
};

const switchSoundEl = document.getElementById("switch-sound");
const blowSoundEl = document.getElementById("blow-sound");
const musicEl = document.getElementById("birthday-music");
const countdownTickSoundEl = document.getElementById("countdown-tick-sound");
const countdownMusicEl = document.getElementById("countdown-music");
const wishTickSoundEl = document.getElementById("wish-tick-sound");

/* -------------------------------------------------------------
   PARTY SCENE — STATE & ELEMENT REFERENCES
   ------------------------------------------------------------- */
const partySceneEls = {
  screen: document.getElementById("party-scene"),
  confettiContainer: document.getElementById("confetti-container"),
  balloonsContainer: document.getElementById("balloons-container"),
};

/* -------------------------------------------------------------
   CAKE & MAKE-A-WISH — STATE & ELEMENT REFERENCES
   ------------------------------------------------------------- */
const cakeEls = {
  candleFlame: document.getElementById("candle-flame"),
};

const wishEls = {
  button: document.getElementById("wish-button"),
  overlay: document.getElementById("wish-overlay"),
  message: document.getElementById("wish-message"),
  countdown: document.getElementById("wish-countdown"),
};

/* -------------------------------------------------------------
   BIRTHDAY LETTER — STATE & ELEMENT REFERENCES
   ------------------------------------------------------------- */
const letterEls = {
  overlay: document.getElementById("letter-overlay"),
  linesContainer: document.getElementById("letter-lines"),
  srText: document.getElementById("letter-sr-text"),
};

/* -------------------------------------------------------------
   FINAL MEMORY — STATE & ELEMENT REFERENCES
   ------------------------------------------------------------- */
const memoryEls = {
  overlay: document.getElementById("memory-overlay"),
  photo: document.getElementById("memory-photo"),
  caption: document.getElementById("memory-caption"),
};

/* -------------------------------------------------------------
   COUNTDOWN — CORE LOGIC
   ------------------------------------------------------------- */

/**
 * Pads a number to at least 2 digits, e.g. 4 -> "04".
 */
function padTwoDigits(value) {
  return String(Math.max(value, 0)).padStart(2, "0");
}

/**
 * Computes the remaining time between now and CONFIG.TARGET_DATE.
 * Returns an object of whole days/hours/minutes/seconds, floored
 * at zero so the display never goes negative.
 */
function getTimeRemaining() {
  const targetTime = new Date(CONFIG.TARGET_DATE).getTime();
  const now = Date.now();
  const totalMs = Math.max(targetTime - now, 0);

  const totalSeconds = Math.floor(totalMs / 1000);

  return {
    total: totalMs,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/**
 * Writes a value into a countdown unit element, padding it and
 * briefly pulsing the digit if it changed since the last render.
 */
function renderUnit(el, unitKey, value) {
  const formatted = padTwoDigits(value);

  if (el.textContent !== formatted) {
    el.textContent = formatted;

    // Only pulse after the first paint, so the page doesn't
    // flash on initial load.
    if (previousValues[unitKey] !== null) {
      el.classList.remove("tick");
      // Force reflow so the animation can be re-triggered on
      // consecutive changes of the same unit.
      void el.offsetWidth;
      el.classList.add("tick");
    }
  }

  previousValues[unitKey] = value;
}

/**
 * Updates all four countdown units on screen. When the target
 * date has been reached, stops the timer and hands off to
 * onCountdownComplete() for the next part of the experience.
 */
function updateCountdown() {
  const remaining = getTimeRemaining();

  renderUnit(countdownEls.days, "days", remaining.days);
  renderUnit(countdownEls.hours, "hours", remaining.hours);
  renderUnit(countdownEls.minutes, "minutes", remaining.minutes);
  renderUnit(countdownEls.seconds, "seconds", remaining.seconds);

  if (remaining.total <= 0) {
    clearInterval(countdownIntervalId);
    onCountdownComplete();
    return;
  }

  playSound(countdownTickSoundEl);
}

/**
 * Called once when the countdown reaches zero (or immediately on
 * load if the target date has already passed). Hands off to
 * Birthday Mode: a fullscreen fade to black.
 */
function onCountdownComplete() {
  stopCountdownMusic();
  showBirthdayModeScreen();
}

/**
 * Pauses and rewinds the countdown's background music. Broken out
 * into its own helper (rather than just calling .pause()) so every
 * stop point resets playback position the same way.
 */
function stopCountdownMusic() {
  if (!countdownMusicEl) return;
  countdownMusicEl.pause();
  countdownMusicEl.currentTime = 0;
}

/**
 * Starts the countdown: renders immediately (no 1s blank flash),
 * then ticks every second.
 */
function startCountdown() {
  const initialRemaining = getTimeRemaining();

  if (initialRemaining.total <= 0) {
    // Target date already passed when the page loaded — skip
    // straight to Birthday Mode, so the countdown music never starts.
    renderUnit(countdownEls.days, "days", 0);
    renderUnit(countdownEls.hours, "hours", 0);
    renderUnit(countdownEls.minutes, "minutes", 0);
    renderUnit(countdownEls.seconds, "seconds", 0);
    onCountdownComplete();
    return;
  }

  updateCountdown();
  countdownIntervalId = setInterval(updateCountdown, 1000);
  playSound(countdownMusicEl);
}

/* -------------------------------------------------------------
   BIRTHDAY MODE — CORE LOGIC
   ------------------------------------------------------------- */

/**
 * Reveals the fullscreen black "Birthday Mode" screen with a smooth
 * fade, covering the countdown screen regardless of its own layout
 * (the black screen is fixed/full-viewport, see style.css).
 */
function showBirthdayModeScreen() {
  const { screen } = birthdayModeEls;

  screen.hidden = false;

  // Force a reflow before adding the class, so the browser registers
  // the starting (opacity: 0) state and actually animates to it
  // rather than snapping straight to the end state.
  void screen.offsetWidth;
  screen.classList.add("is-visible");

  // Once the black screen has fully covered the viewport, stop
  // rendering the countdown screen underneath — keeps it out of the
  // tab order and off-screen for anyone scrolling.
  window.setTimeout(() => {
    countdownEls.screen.style.display = "none";
  }, CONFIG.TIMINGS.blackScreenFadeMs);
}

/**
 * Plays a sound effect from the start, ignoring (rather than
 * throwing on) autoplay/interaction errors — sound is a nice-to-have
 * here, never something that should break the experience.
 */
function playSound(audioEl) {
  if (!audioEl) return;

  audioEl.currentTime = 0;
  const playPromise = audioEl.play();

  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      /* Playback blocked or interrupted — fail silently. */
    });
  }
}

/**
 * Handles the "Turn on the lights" button: plays the switch sound,
 * gradually lights the room (see .lights-on styles in style.css),
 * retires the button, then hands off to the party scene reveal.
 */
function handleLightsButtonClick() {
  const { screen, lightsButton } = birthdayModeEls;

  // Prevent double-triggering while the lighting animation runs.
  lightsButton.disabled = true;

  playSound(switchSoundEl);
  screen.classList.add("lights-on");

  window.setTimeout(() => {
    revealBirthdayScene();
  }, CONFIG.TIMINGS.lightsOnDurationMs);
}

/**
 * Returns a random number between min and max (inclusive-ish),
 * used throughout the decoration code to add natural variety.
 */
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Returns a random item from an array.
 */
function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Creates a single confetti piece with randomized color, size,
 * shape, horizontal position, and fall timing, then appends it to
 * the confetti container. Kept as its own function so a later part
 * (the Celebration scene) can simply call it more times to make the
 * confetti "more lively" without any structural changes here.
 */
function createConfettiPiece() {
  const {
    confettiColors,
    confettiFallDurationRange,
    confettiFallDelayRange,
    confettiSizeRange,
  } = CONFIG.DECOR;

  const piece = document.createElement("span");
  piece.className = "confetti-piece";

  // Roughly half square/rectangular, half circular, for variety.
  const isCircle = Math.random() > 0.5;
  if (isCircle) piece.classList.add("is-circle");

  const size = randomBetween(confettiSizeRange[0], confettiSizeRange[1]);
  const height = isCircle ? size : size * 1.6;

  piece.style.left = `${randomBetween(0, 100)}%`;
  piece.style.width = `${size}px`;
  piece.style.height = `${height}px`;
  piece.style.backgroundColor = randomFrom(confettiColors);
  piece.style.animationDuration = `${randomBetween(confettiFallDurationRange[0], confettiFallDurationRange[1])}s`;
  piece.style.animationDelay = `-${randomBetween(confettiFallDelayRange[0], confettiFallDelayRange[1])}s`;

  return piece;
}

/**
 * Spawns `count` confetti pieces into the party scene at once.
 */
function spawnConfetti(count) {
  const { confettiContainer } = partySceneEls;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i += 1) {
    fragment.appendChild(createConfettiPiece());
  }

  confettiContainer.appendChild(fragment);
}

/**
 * Creates a single extra balloon, structurally identical to the
 * static ones already in index.html (a .balloon with a
 * .balloon-string), but randomized and positioned via inline
 * styles/custom properties instead of a fixed CSS class. Reuses the
 * exact same .balloon/.balloon-string rules from Part 4 — no new
 * CSS is needed for this to float and sway correctly.
 */
function createBalloon() {
  const {
    balloonColors,
    balloonSizeRange,
    balloonFloatDurationRange,
    balloonFloatDelayRange,
  } = CONFIG.DECOR;

  const balloon = document.createElement("div");
  balloon.className = "balloon";

  const string = document.createElement("span");
  string.className = "balloon-string";
  balloon.appendChild(string);

  const width = randomBetween(balloonSizeRange[0], balloonSizeRange[1]);
  const height = width * 1.24;

  balloon.style.left = `${randomBetween(2, 96)}%`;
  balloon.style.bottom = `${randomBetween(-4, 30)}%`;
  balloon.style.width = `${width}px`;
  balloon.style.height = `${height}px`;
  balloon.style.setProperty("--balloon-color", randomFrom(balloonColors));
  balloon.style.setProperty(
    "--float-duration",
    `${randomBetween(balloonFloatDurationRange[0], balloonFloatDurationRange[1])}s`,
  );
  balloon.style.setProperty(
    "--float-delay",
    `-${randomBetween(balloonFloatDelayRange[0], balloonFloatDelayRange[1])}s`,
  );

  return balloon;
}

/**
 * Spawns `count` extra balloons into the party scene, on top of
 * whichever ones are already floating there.
 */
function spawnBalloons(count) {
  const { balloonsContainer } = partySceneEls;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i += 1) {
    fragment.appendChild(createBalloon());
  }

  balloonsContainer.appendChild(fragment);
}

/**
 * Called once the room has finished lighting up. Performs the
 * cinematic reveal: the party scene (balloons, fairy lights,
 * bunting, sparkles, and confetti) fades/zooms in underneath the
 * lit black screen, then that screen dissolves away to reveal it.
 */
function revealBirthdayScene() {
  const { screen: sceneScreen } = partySceneEls;

  // Populate the confetti fresh each time the scene is revealed.
  spawnConfetti(CONFIG.DECOR.initialConfettiCount);

  sceneScreen.hidden = false;

  // Force reflow so the fade/zoom-in transition actually animates
  // from its starting state instead of snapping straight to visible.
  void sceneScreen.offsetWidth;
  sceneScreen.classList.add("is-visible");

  // Let the scene establish itself for a beat before the lit screen
  // starts dissolving away — makes the reveal feel intentional
  // rather than an instant swap.
  window.setTimeout(() => {
    birthdayModeEls.screen.classList.add("scene-revealed");

    // Once fully dissolved, stop rendering the birthday-mode screen
    // so it can't intercept clicks or scrolling anymore.
    window.setTimeout(() => {
      birthdayModeEls.screen.style.display = "none";
    }, CONFIG.TIMINGS.modeScreenFadeOutMs);
  }, CONFIG.TIMINGS.sceneRevealDelayMs);
}

/* -------------------------------------------------------------
   MAKE A WISH — CORE LOGIC
   ------------------------------------------------------------- */

/**
 * Handles the "Make a wish" button: retires the button, shows the
 * "Make a wish..." message, then hands off to the 3-2-1 countdown.
 */
function handleWishButtonClick() {
  const { button, overlay, message } = wishEls;

  // Prevent double-triggering while the sequence plays out.
  button.disabled = true;
  button.classList.add("is-hidden");

  message.textContent = CONFIG.MESSAGES.wishText;
  message.hidden = false;
  wishEls.countdown.hidden = true;

  overlay.classList.add("is-visible");

  window.setTimeout(() => {
    runWishCountdown(CONFIG.MESSAGES.wishCountdownSteps, 0);
  }, CONFIG.TIMINGS.wishMessageDurationMs);
}

/**
 * Steps through the 3-2-1 countdown one value at a time, swapping
 * the "Make a wish..." message for the big pulsing digits. Once the
 * sequence is exhausted, hands off to blowOutCandle().
 */
function runWishCountdown(steps, index) {
  const { message, countdown } = wishEls;

  if (index >= steps.length) {
    blowOutCandle();
    return;
  }

  // Swap the message out for the countdown on the first tick only.
  if (index === 0) {
    message.hidden = true;
    countdown.hidden = false;
  }

  countdown.textContent = steps[index];

  // Re-trigger the pulse animation on every step, the same way the
  // countdown screen's digit "tick" pulse works in Part 1.
  countdown.classList.remove("pulse");
  void countdown.offsetWidth;
  countdown.classList.add("pulse");

  playSound(wishTickSoundEl);

  window.setTimeout(() => {
    runWishCountdown(steps, index + 1);
  }, CONFIG.TIMINGS.wishCountdownStepMs);
}

/**
 * Creates a single soft smoke puff at the candle's position and
 * lets its own CSS animation carry it up and away, removing itself
 * from the DOM once that animation finishes.
 */
function createSmokeWisp(offsetX, delaySeconds) {
  const wisp = document.createElement("span");
  wisp.className = "smoke-wisp";
  wisp.style.left = `calc(50% + ${offsetX}px)`;
  wisp.style.animationDelay = `${delaySeconds}s`;

  wisp.addEventListener("animationend", () => wisp.remove());

  return wisp;
}

/**
 * Called once the wish countdown finishes. Plays the blow sound,
 * animates the flame being blown out (tilt, shrink, drift, fade),
 * puffs a little smoke where it used to be, and clears the wish
 * overlay — then hands off to onCandleBlownOut() for the next part.
 */
function blowOutCandle() {
  const { overlay } = wishEls;
  const { candleFlame } = cakeEls;

  overlay.classList.remove("is-visible");

  playSound(blowSoundEl);
  candleFlame.classList.add("is-blown-out");

  const wispFragment = document.createDocumentFragment();
  wispFragment.appendChild(createSmokeWisp(-3, 0));
  wispFragment.appendChild(createSmokeWisp(2, 0.15));
  wispFragment.appendChild(createSmokeWisp(-1, 0.3));
  candleFlame.appendChild(wispFragment);

  window.setTimeout(() => {
    onCandleBlownOut();
  }, CONFIG.TIMINGS.blowOutAnimMs);
}

/**
 * Called once the candle is fully out and its smoke has cleared.
 * Kicks off the Celebration: starts the birthday music, spawns
 * extra balloons and confetti on top of what's already in the
 * scene, and speeds up the existing decorations' animations so the
 * room feels livelier. Nothing already running is stopped — this
 * only adds to it.
 */
function onCandleBlownOut() {
  const { screen: sceneScreen } = partySceneEls;

  sceneScreen.classList.add("is-celebrating");

  spawnConfetti(CONFIG.DECOR.celebrationConfettiCount);
  spawnBalloons(CONFIG.DECOR.celebrationBalloonCount);

  playSound(musicEl);

  window.setTimeout(() => {
    showLetter();
  }, CONFIG.TIMINGS.letterRevealDelayMs);
}

/* -------------------------------------------------------------
   BIRTHDAY LETTER — CORE LOGIC
   ------------------------------------------------------------- */

/**
 * Reveals the letter card and kicks off the line-by-line typewriter
 * sequence. The full message is written into a visually-hidden
 * element up front so screen readers get it immediately, rather
 * than character by character.
 */
function showLetter() {
  const { overlay, srText } = letterEls;

  srText.textContent = CONFIG.MESSAGES.letterLines.join(" ");

  overlay.classList.add("is-visible");
  typeLetterLine(0);
}

/**
 * Types out CONFIG.MESSAGES.letterLines[index] one character at a
 * time into a newly-created line element (which itself fades/slides
 * in as soon as it's added), then recurses to the next line once
 * done. When every line has been typed, pauses briefly and hands
 * off to onLetterComplete().
 */
function typeLetterLine(index) {
  const { linesContainer } = letterEls;
  const lines = CONFIG.MESSAGES.letterLines;

  if (index >= lines.length) {
    window.setTimeout(() => {
      onLetterComplete();
    }, CONFIG.TIMINGS.typewriterLinePauseMs);
    return;
  }

  const fullText = lines[index];

  const lineEl = document.createElement("p");
  lineEl.className = "letter-line";

  const textSpan = document.createElement("span");
  textSpan.className = "letter-line-text";

  const cursor = document.createElement("span");
  cursor.className = "letter-cursor";

  lineEl.appendChild(textSpan);
  lineEl.appendChild(cursor);
  linesContainer.appendChild(lineEl);

  // Force reflow so the fade/slide-in transition actually animates
  // rather than snapping straight to visible.
  void lineEl.offsetWidth;
  lineEl.classList.add("is-visible");

  let charIndex = 0;
  const typeIntervalId = window.setInterval(() => {
    charIndex += 1;
    textSpan.textContent = fullText.slice(0, charIndex);

    if (charIndex >= fullText.length) {
      window.clearInterval(typeIntervalId);
      cursor.classList.add("is-done");

      window.setTimeout(() => {
        typeLetterLine(index + 1);
      }, CONFIG.TIMINGS.typewriterLinePauseMs);
    }
  }, CONFIG.TIMINGS.typewriterCharMs);
}

/**
 * Called once every line of the letter has finished typing and the
 * closing pause has passed. Fades the letter card away, then hands
 * off to the Final Memory reveal. Balloons, sparkles, fairy lights,
 * and the birthday music all keep running throughout — nothing
 * about the party scene itself is touched here.
 */
function onLetterComplete() {
  letterEls.overlay.classList.remove("is-visible");

  window.setTimeout(() => {
    showFinalMemory();
  }, CONFIG.TIMINGS.letterFadeOutMs + CONFIG.TIMINGS.memoryRevealDelayMs);
}

/* -------------------------------------------------------------
   FINAL MEMORY — CORE LOGIC
   ------------------------------------------------------------- */

/**
 * Reveals the closing photo + caption once the letter has fully
 * faded away. This is the last scripted step of the experience —
 * the party scene (balloons, sparkles, fairy lights, music) simply
 * keeps looping behind it from here on.
 */
function showFinalMemory() {
  const { overlay, caption } = memoryEls;

  caption.textContent = CONFIG.MESSAGES.caption;
  overlay.classList.add("is-visible");
}

/* -------------------------------------------------------------
   INIT
   ------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  startCountdown();
  birthdayModeEls.lightsButton.addEventListener(
    "click",
    handleLightsButtonClick,
  );
  wishEls.button.addEventListener("click", handleWishButtonClick);
});
