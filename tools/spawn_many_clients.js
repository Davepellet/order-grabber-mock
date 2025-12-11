require("dotenv").config();
const { fork } = require("child_process");
const path = require("path");

const BOT_COUNT = Number(process.env.BOT_COUNT) || 5;

const children = [];

// Spawn bots
for (let i = 1; i <= BOT_COUNT; i++) {
  const child = fork(path.join(__dirname, "client_child.js"), [], {
    env: { ...process.env, BOT_ID: i } // give each bot a unique ID
  });
  children.push(child);
  console.log(`Spawned bot #${i}`);

  // Optional: handle messages from child
  child.on("message", (msg) => {
    console.log(`Bot #${i}:`, msg);
  });

  // Restart bot if it crashes
  child.on("exit", (code) => {
    console.log(`Bot #${i} exited with code ${code}. Restarting in 2s...`);
    setTimeout(() => {
      const newChild = fork(path.join(__dirname, "client_child.js"), [], {
        env: { ...process.env, BOT_ID: i }
      });
      children[i - 1] = newChild;
    }, 2000);
  });
}

// Stop all bots function
function stopAllBots() {
  console.log("Stopping all bots...");
  children.forEach((child, index) => {
    child.kill();
    console.log(`Stopped bot #${index + 1}`);
  });
}

// Graceful shutdown
process.on("SIGINT", () => {
  stopAllBots();
  process.exit();
});

module.exports = { stopAllBots };
