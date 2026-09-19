import fs from "fs";
import path from "path";

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (full.includes(`${path.sep}generated${path.sep}prisma`)) continue;

    const content = fs.readFileSync(full, "utf8");
    const updated = content.replace(
      /@\/generated\/prisma"/g,
      '@/generated/prisma/client"',
    );
    if (updated !== content) {
      fs.writeFileSync(full, updated);
      console.log("updated", full);
    }
  }
}

walk("src");
walk("tests");
