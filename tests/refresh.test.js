const fs = require("fs");
const path = require("path");
const vm = require("vm");

(async () => {
  const modulePath = path.resolve(__dirname, "../src/refresh.js");
  let source = fs.readFileSync(modulePath, "utf8");

  source = source
    .replace(/export\s+function\s+setupAutoRefresh/, "function setupAutoRefresh")
    .concat("\nmodule.exports = { setupAutoRefresh };\n");

  const sandbox = {
    module: { exports: {} },
    exports: {},
    console
  };

  vm.runInNewContext(source, sandbox, { filename: "refresh.js" });

  const { setupAutoRefresh } = sandbox.module.exports;

  let scheduledFn = null;
  let scheduledDelay = null;
  let reloadCount = 0;

  const fakeWindow = {
    location: {
      reload: () => {
        reloadCount += 1;
      }
    }
  };

  const scheduler = (fn, delay) => {
    scheduledFn = fn;
    scheduledDelay = delay;
    return 1234;
  };

  const intervalHandle = setupAutoRefresh(fakeWindow, 1000, scheduler);

  if (intervalHandle !== 1234) {
    throw new Error(`Expected scheduler return value to bubble up; got ${intervalHandle}`);
  }

  if (scheduledDelay !== 1000) {
    throw new Error(`Expected delay 1000ms, received ${scheduledDelay}`);
  }

  if (typeof scheduledFn !== "function") {
    throw new Error("Scheduler should receive a callback function");
  }

  scheduledFn();

  if (reloadCount !== 1) {
    throw new Error(`Expected reload to fire once, saw ${reloadCount} times`);
  }

  let errorCaught = false;
  try {
    setupAutoRefresh({}, 1000, scheduler);
  } catch {
    errorCaught = true;
  }

  if (!errorCaught) {
    throw new Error("Expected setupAutoRefresh to throw when window.location.reload is missing");
  }

  console.log("refresh.test.js: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
