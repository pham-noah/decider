// Runs the Android Gradle wrapper from any shell: `node scripts/gradle.mjs assembleDebug`
// npm scripts execute through cmd.exe on Windows, where "./gradlew" is not a valid
// command, so the task has to be spawned with the right wrapper name.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const tasks = process.argv.slice(2);
if (!tasks.length) {
  console.error("usage: node scripts/gradle.mjs <task...>");
  process.exit(1);
}

const win = process.platform === "win32";
const wrapper = win ? "gradlew.bat" : "./gradlew";
if (!existsSync(`android/${wrapper}`)) {
  console.error(`missing android/${wrapper} — run "npm run android:add" first`);
  process.exit(1);
}

const javaHome =
  process.env.JAVA_HOME ||
  ["C:/Program Files/Android/Android Studio/jbr", "/usr/lib/jvm/default-java"].find((p) => existsSync(p));
if (!javaHome) {
  console.error("JAVA_HOME is not set and no JDK was found — install Android Studio or set JAVA_HOME");
  process.exit(1);
}

const res = spawnSync(wrapper, tasks, {
  cwd: "android",
  stdio: "inherit",
  shell: win,
  env: { ...process.env, JAVA_HOME: javaHome },
});
process.exit(res.status ?? 1);
