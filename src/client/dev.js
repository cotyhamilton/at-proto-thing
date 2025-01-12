// Development WebSocket client for hot reloading
let wasConnected = false;

function hotReload() {
  const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
  const host = globalThis.location.host;
  const ws = new WebSocket(`${protocol}//${host}/dev`);

  ws.addEventListener("open", () => {
    console.log("[Dev] Hot reload connection established");
    if (wasConnected) {
      console.log("[Dev] Reconnected after disconnect, reloading page...");
      globalThis.location.reload();
    }
    wasConnected = true;
  });

  ws.addEventListener("message", (event) => {
    if (event.data === "reload") {
      console.log("[Dev] Server restart detected, reloading page...");
      globalThis.location.reload();
    }
  });

  ws.addEventListener("close", () => {
    console.log(
      "[Dev] Hot reload connection closed, attempting to reconnect...",
    );
    // Try to reconnect after 2 seconds
    setTimeout(hotReload, 2000);
  });

  ws.addEventListener("error", (error) => {
    console.error("[Dev] WebSocket error:", error);
  });
}

hotReload();
