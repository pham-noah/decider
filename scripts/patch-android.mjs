// Runs after `cap add android` and after every `cap sync android`. Idempotent.
//   1. dark window + splash backgrounds, so there is no white flash on launch
//   2. versionName / versionCode taken from package.json (code = major*10000+minor*100+patch)
//   3. release signing, when android/keystore.properties exists
import { readFileSync, writeFileSync, existsSync } from "node:fs";

/* ---- 1. dark backgrounds ---- */
const styles = "android/app/src/main/res/values/styles.xml";
if (existsSync(styles)) {
  let s = readFileSync(styles, "utf8");
  if (!s.includes("android:windowBackground")) {
    s = s.replace(/(<style name="AppTheme.NoActionBar"[^>]*>)/, '$1\n        <item name="android:windowBackground">#0c0922</item>');
  }
  if (!s.includes("windowSplashScreenBackground")) {
    s = s.replace(/(<style name="AppTheme.NoActionBarLaunch"[^>]*>)/, '$1\n        <item name="windowSplashScreenBackground">#0c0922</item>');
  }
  writeFileSync(styles, s);
}

/* ---- 1b. resize the WebView with the keyboard (edge-to-edge hides the bars) ---- */
const manifest = "android/app/src/main/AndroidManifest.xml";
if (existsSync(manifest)) {
  let s = readFileSync(manifest, "utf8");
  if (!s.includes("windowSoftInputMode")) {
    s = s.replace(/(<activity\b[^>]*?)(\s*android:name="\.MainActivity")/, '$1\n            android:windowSoftInputMode="adjustResize"$2');
  }
  writeFileSync(manifest, s);
}

/* ---- 2 + 3. build.gradle ---- */
const gradle = "android/app/build.gradle";
if (existsSync(gradle)) {
  const { version } = JSON.parse(readFileSync("package.json", "utf8"));
  const [maj = 1, min = 0, patch = 0] = version.split(".").map((n) => parseInt(n, 10) || 0);
  const code = maj * 10000 + min * 100 + patch;

  let s = readFileSync(gradle, "utf8");
  s = s.replace(/versionCode\s+\d+/, `versionCode ${code}`);
  s = s.replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);

  if (existsSync("android/keystore.properties") && !s.includes("keystore.properties")) {
    // android/keystore.properties (never committed):
    //   storeFile=../../Decider-keys/decider-release.jks
    //   storePassword=...
    //   keyAlias=decider
    //   keyPassword=...
    s = s.replace(/^android\s*\{/m, `def keyProps = new Properties()
def keyPropsFile = rootProject.file("keystore.properties")
if (keyPropsFile.exists()) { keyPropsFile.withInputStream { keyProps.load(it) } }

android {`);
    s = s.replace(
      /^(\s*)buildTypes\s*\{/m,
      `$1signingConfigs {
$1    release {
$1        if (keyPropsFile.exists()) {
$1            storeFile rootProject.file(keyProps["storeFile"])
$1            storePassword keyProps["storePassword"]
$1            keyAlias keyProps["keyAlias"]
$1            keyPassword keyProps["keyPassword"]
$1        }
$1    }
$1}
$1buildTypes {`
    );
    s = s.replace(/(\s*)minifyEnabled false/, `$1minifyEnabled false\n$1if (keyPropsFile.exists()) { signingConfig signingConfigs.release }`);
    console.log("Android signing patched");
  }
  writeFileSync(gradle, s);
}
console.log("Android project patched");
