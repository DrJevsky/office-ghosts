# Office Ghosts Screensaver

A browser-based, game-inspired screensaver where a debugging pac-creature roams a neon maze and devours mischievous software bugs. Built with one self-contained HTML/CSS/JavaScript bundle—no build step required.

## ✨ Highlights

- **Atmospheric maze** with glowing walls, gradient floors, and a glassy canvas frame.
- **Animated debugger** character featuring mouth chomps, eye glints, and a soft particle trail.
- **Floating software bugs** that bob, glow, and respawn after being eaten.
- **Spark bursts & ambient particles** to celebrate each successful bug snack.
- **Responsive layout** that scales elegantly from desktops down to tablets.

## 🚀 Getting Started

1. Open `index.html` directly in any modern browser (Chrome, Edge, Firefox, Safari).
2. Or serve the folder locally for hot reload convenience:

   ```bash
   cd office-ghosts
   python3 -m http.server 9000
   ```

   Then visit <http://localhost:9000>.

## 🛠️ Validation

- HTML structure verified with `npx -y html-validate index.html`.

## 🧠 Architecture Notes

- `index.html` wires the canvas, HUD, and module script.
- `style.css` handles gradients, glassmorphism, typography, and responsive treatments.
- `main.js` bootstraps the `Screensaver` class.
- `src/screensaver.js` contains all rendering, animation, and entity logic (maze, debugger, bugs, particles, sparks).

## 🧭 Next Ideas

- Add keyboard easter eggs to toggle color palettes.
- Introduce wandering "ghost processes" that chase the debugger for extra drama.
- Allow the maze layout to randomize periodically for variety.
