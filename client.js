require("dotenv").config();
const WebSocket = require("ws");
const ioClient = require("socket.io-client");

// Read config from .env
const PORT = process.env.PORT || 3000;
const MIN_PRICE = Number(process.env.MIN_PRICE) || 0;
const TARGET_REGION = process.env.TARGET_REGION || "NG";

// WebSocket server URL
const WS_URL = `ws://localhost:${PORT}/orders`;
// Socket.IO dashboard URL
const DASHBOARD_URL = `http://localhost:${PORT}`;

// Connect to dashboard Socket.IO
const dashboardSocket = ioClient(DASHBOARD_URL);

// Connect to WebSocket order feed
function connectClient() {
  const ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log(`Connected to mock order feed at ${WS_URL}`);
  });

  ws.on("message", (data) => {
    try {
      const order = JSON.parse(data);

      // Filter orders by price and region
      if (Number(order.price) >= MIN_PRICE && order.region === TARGET_REGION) {
        console.log("✅ Grabbed order:", order);

        // Send grabbed order to server dashboard
        dashboardSocket.emit("grab", order);
      } else {
        console.log("Order ignored:", order);
      }
    } catch (err) {
      console.error("Error parsing order:", err.message);
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });

  ws.on("close", () => {
    console.log("Disconnected from order feed. Reconnecting in 2s...");
    setTimeout(connectClient, 2000); // auto-reconnect
  });
}

// Start the client
connectClient();
