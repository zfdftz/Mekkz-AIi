import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const keystorePath = join(root, "android", "keystore.properties");

if (!existsSync(keystorePath)) {
  console.error(`
Missing android/keystore.properties

1. Copy android/keystore.properties.example to android/keystore.properties
2. Create a release keystore (once):
   keytool -genkeypair -v -storetype PKCS12 -keystore mekkzai-release.jks -alias mekkzai -keyalg RSA -keysize 2048 -validity 10000
3. Fill in storeFile, passwords, and keyAlias in keystore.properties
4. Run this script again
`);
  process.exit(1);
}

console.log("Syncing Capacitor Android project...");
execSync("npx cap sync android", { stdio: "inherit", cwd: root });

console.log("Building signed release AAB for Google Play...");
const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
execSync(`${gradle} bundleRelease`, {
  stdio: "inherit",
  cwd: join(root, "android")
});

console.log(`
Done. Upload this file to Google Play Console:
  android/app/build/outputs/bundle/release/app-release.aab

Privacy policy URL for the listing:
  https://mekkzai.com/privacy
`);
