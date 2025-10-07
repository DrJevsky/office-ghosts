import { Screensaver } from "./src/screensaver.js";

const canvas = document.getElementById("screensaver");
const screensaver = new Screensaver(canvas);

function resize() {
  const size = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9, 780);
  canvas.width = size;
  canvas.height = size;
  screensaver.resize(size, size);
}

window.addEventListener("resize", resize);
resize();

screensaver.start();
