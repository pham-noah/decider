// Copies the Bricolage Grotesque woff2 files (400/600/800) from @fontsource into www/fonts
import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("www/fonts", { recursive: true });
for (const w of [400, 600, 800]) {
  copyFileSync(
    `node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-${w}-normal.woff2`,
    `www/fonts/bricolage-${w}.woff2`
  );
  copyFileSync(
    `node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-ext-${w}-normal.woff2`,
    `www/fonts/bricolage-${w}-ext.woff2`
  );
}
console.log("Fonts copied to www/fonts");
