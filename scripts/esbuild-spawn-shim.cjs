const childProcess = require("child_process");
const path = require("path");

const realSpawn = childProcess.spawn;
const realExecFile = childProcess.execFile;
const esbuildBinaryPattern = /[\\/]@esbuild[\\/][^\\/]+[\\/]esbuild\.exe$/i;
const proxyScript = path.join(__dirname, "esbuild-proxy.cjs");

function shouldWrap(command) {
  return typeof command === "string" && esbuildBinaryPattern.test(command);
}

function spawnThroughProxy(command, args = [], options = {}) {
  const spawnOptions = {
    ...options,
    stdio: options.stdio || "pipe",
    windowsHide: options.windowsHide ?? true,
  };

  return realSpawn(process.execPath, [proxyScript, command, ...args], spawnOptions);
}

childProcess.spawn = function patchedSpawn(command, args, options) {
  if (shouldWrap(command)) {
    return spawnThroughProxy(command, args, options);
  }

  return realSpawn.call(this, command, args, options);
};

childProcess.execFile = function patchedExecFile(command, args, options, callback) {
  if (shouldWrap(command)) {
    const child = spawnThroughProxy(command, args, options);

    if (typeof options === "function") {
      callback = options;
    }

    if (typeof callback === "function") {
      let stdout = "";
      let stderr = "";

      if (child.stdout) {
        child.stdout.on("data", (chunk) => {
          stdout += chunk;
        });
      }

      if (child.stderr) {
        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });
      }

      child.on("error", (error) => callback(error, stdout, stderr));
      child.on("close", (code) => {
        if (code === 0) {
          callback(null, stdout, stderr);
          return;
        }

        const error = new Error(`Command failed: ${command} ${args.join(" ")}`);
        error.code = code;
        callback(error, stdout, stderr);
      });
    }

    return child;
  }

  return realExecFile.call(this, command, args, options, callback);
};
