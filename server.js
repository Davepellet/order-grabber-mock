require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { WebSocketServer } = require("ws");

// Bot spawn/stop functions
const { startClients, stopClients } = require("./tools/spawn_many_clients");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve dashboard
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);

// Socket.IO for dashboard
const io = new Server(server);

// WebSocket for order feed
const wss = new WebSocketServer({ server, path: "/orders" });

// Store data
let orders = [];
let grabbedOrders = [];
let activeBots = 0;
let botStatsMap = {}; // per-bot grabbed count

// Bot settings
let botSettings = {
  MIN_PRICE: Number(process.env.MIN_PRICE) || 0,
  TARGET_REGION: process.env.TARGET_REGION || "NG"
};

// Generate fake orders
function generateOrder() {
  const id = Math.floor(Math.random() * 999999);
  const price = (Math.random() * 10).toFixed(2);
  const region = ["US", "UK", "NG", "KE"][Math.floor(Math.random() * 4)];
  return { id, price, region, timestamp: Date.now() };
}

// ===== WebSocket order feed =====
wss.on("connection", (ws) => {
  console.log("Client connected to order feed");

  const interval = setInterval(() => {
    const order = generateOrder();
    orders.push(order);
    if (orders.length > 50) orders.shift();

    ws.send(JSON.stringify(order));
    io.emit("orders", orders); // update dashboard
  }, 2000);

  ws.on("close", () => {
    clearInterval(interval);
    console.log("Client disconnected from order feed");
  });
});

// ===== Socket.IO dashboard =====
io.on("connection", (socket) => {
  console.log("Dashboard connected");

  // Send initial data
  socket.emit("settingsUpdate", botSettings);
  socket.emit("botStats", { activeBots, totalGrabbed: grabbedOrders.length, perBot: botStatsMap });

  // Grab event
  socket.on("grab", (order) => {
    grabbedOrders.push(order);
    if (grabbedOrders.length > 50) grabbedOrders.shift();

    // Track per-bot grabs
    if (order.botId !== undefined) {
      botStatsMap[order.botId] = (botStatsMap[order.botId] || 0) + 1;
    }

    io.emit("grabbed", grabbedOrders);
    io.emit("botStats", { activeBots, totalGrabbed: grabbedOrders.length, perBot: botStatsMap });
  });

  // Start bots
  socket.on("startBots", () => {
    const num = Number(process.env.BOT_COUNT) || 5;
    startClients(num);
    activeBots += num;

    io.emit("botStats", { activeBots, totalGrabbed: grabbedOrders.length, perBot: botStatsMap });
    console.log(`Started ${num} bots. Active: ${activeBots}`);
  });

  // Stop bots
  socket.on("stopBots", () => {
    stopClients();
    activeBots = 0;
    botStatsMap = {};

    io.emit("botStats", { activeBots, totalGrabbed: grabbedOrders.length, perBot: botStatsMap });
    console.log("Stopped all bots");
  });

  // Update bot settings
  socket.on("updateSettings", (newSettings) => {
    if (newSettings.MIN_PRICE !== undefined) botSettings.MIN_PRICE = Number(newSettings.MIN_PRICE);
    if (newSettings.TARGET_REGION) botSettings.TARGET_REGION = newSettings.TARGET_REGION;

    io.emit("settingsUpdate", botSettings);
    console.log("Updated bot settings:", botSettings);
  });
});

// Start server on 0.0.0.0 so it’s accessible externally
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
