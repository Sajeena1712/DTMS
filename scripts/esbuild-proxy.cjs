const { spawn } = require("child_process");

const binaryPath = process.argv[2];
const binaryArgs = process.argv.slice(3);

const child = spawn(binaryPath, binaryArgs, {
  stdio: "inherit",
  windowsHide: true,
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});
