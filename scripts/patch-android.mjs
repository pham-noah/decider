// Run automatically by `npm run android:add`. Sets dark backgrounds so there is no white flash on launch.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const f = "android/app/src/main/res/values/styles.xml";
if (existsSync(f)) {
  let s = readFileSync(f, "utf8");
  if (!s.includes("android:windowBackground")) {
    s = s.replace(/(<style name="AppTheme.NoActionBar"[^>]*>)/, '$1\n        <item name="android:windowBackground">#0c0922</item>');
  }
  // Android 12+ system splash background (the icon on top comes from the launcher icon)
  if (!s.includes("windowSplashScreenBackground")) {
    s = s.replace(/(<style name="AppTheme.NoActionBarLaunch"[^>]*>)/, '$1\n        <item name="windowSplashScreenBackground">#0c0922</item>');
  }
  writeFileSync(f, s);
}
console.log("Android project patched");
