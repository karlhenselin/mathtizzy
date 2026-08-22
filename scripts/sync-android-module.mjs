import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const from = join(root, "android", "app");
const to = join(root, "android", "mathtizzy");

if (!existsSync(from) || !existsSync(to)) process.exit(0);

cpSync(join(from, "src", "main", "assets"), join(to, "src", "main", "assets"), { recursive: true });
cpSync(join(from, "capacitor.build.gradle"), join(to, "capacitor.build.gradle"));
console.log("Copied Capacitor android/app outputs into android/mathtizzy");
