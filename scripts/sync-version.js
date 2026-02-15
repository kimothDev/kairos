#!/usr/bin/env node
/**
 * Version Sync Script
 *
 * Updates version numbers across all config files from version.json
 *
 * Usage: node scripts/sync-version.js
 *
 * Edit version.json to change the version, then run this script.
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const versionFile = path.join(projectRoot, "version.json");

// Read version.json
const versionConfig = JSON.parse(fs.readFileSync(versionFile, "utf8"));
const { version, versionCode, appName } = versionConfig;

console.log(`\n📦 Syncing version: ${version} (code: ${versionCode})\n`);

// Update package.json
const packageJsonPath = path.join(projectRoot, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
packageJson.version = version;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
console.log(`✅ Updated package.json`);

// Update app.json
const appJsonPath = path.join(projectRoot, "app.json");
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
appJson.expo.version = version;
if (appJson.expo.android) {
  appJson.expo.android.versionCode = versionCode;
}
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");
console.log(`✅ Updated app.json`);

// Update android/app/build.gradle
const buildGradlePath = path.join(
  projectRoot,
  "android",
  "app",
  "build.gradle",
);
let buildGradle = fs.readFileSync(buildGradlePath, "utf8");
buildGradle = buildGradle.replace(
  /versionCode \d+/,
  `versionCode ${versionCode}`,
);
buildGradle = buildGradle.replace(
  /versionName "[^"]+"/,
  `versionName "${version}"`,
);
fs.writeFileSync(buildGradlePath, buildGradle);
console.log(`✅ Updated android/app/build.gradle`);

// Update RELEASE_NOTES.md version references
const releaseNotesPath = path.join(projectRoot, "RELEASE_NOTES.md");
if (fs.existsSync(releaseNotesPath)) {
  let releaseNotes = fs.readFileSync(releaseNotesPath, "utf8");
  // Update version in title and file names
  releaseNotes = releaseNotes.replace(/v\d+\.\d+\.\d+/g, `v${version}`);
  releaseNotes = releaseNotes.replace(
    /SmartFocusTimer-\d+\.\d+\.\d+/g,
    `SmartFocusTimer-${version}`,
  );
  fs.writeFileSync(releaseNotesPath, releaseNotes);
  console.log(`✅ Updated RELEASE_NOTES.md`);
}

console.log(`\n🎉 Version sync complete!\n`);
console.log(`Next steps:`);
console.log(`  1. Review changes: git diff`);
console.log(
  `  2. Commit: git add -A && git commit -m "Bump version to ${version}"`,
);
console.log(`  3. Build: cd android && ./gradlew assembleRelease`);
