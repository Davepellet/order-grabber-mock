require("dotenv").config();
const WebSocket = require("ws");
const ioClient = require("socket.io-client");

const BOT_ID = process.env.BOT_ID || 0;
const PORT = process.env.PORT || 3000;
const MIN_PRICE = Number(process.env.MIN_PRICE) || 0;
const TARGET_REGION = process.env.TARGET_REGION || "NG";

// URLs
const WS_URL = `ws://localhost:${PORT}/orders`;
const DASHBOARD_URL = `http://localhost:${PORT}`;
const dashboardSocket = ioClient(DASHBOARD_URL);

function connectBot() {
  const ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log(`Bot #${BOT_ID} connected to order feed`);
  });

  ws.on("message", (data) => {
    try {
      const order = JSON.parse(data);

      // Check if order matches bot settings
      if (Number(order.price) >= MIN_PRICE && order.region === TARGET_REGION) {
        console.log(`Bot #${BOT_ID} grabbed order:`, order);

        // Report grab to dashboard
        dashboardSocket.emit("grab", { ...order, botId: BOT_ID });
      }
    } catch (err) {
      console.error(`Bot #${BOT_ID} error parsing order:`, err.message);
    }
  });

  ws.on("close", () => {
    console.log(`Bot #${BOT_ID} disconnected. Reconnecting in 2s...`);
    setTimeout(connectBot, 2000);
  });

  ws.on("error", (err) => {
    console.error(`Bot #${BOT_ID} WebSocket error:`, err.message);
  });
}

// Start the bot
connectBot();
