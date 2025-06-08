#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const BIDI_REGEX = /[\u200E\u200F\u202A-\u202E]/g;

// 删除不可见字符
function cleanFile(filePath, backup = true) {
  const content = fs.readFileSync(filePath, "utf8");

  if (!BIDI_REGEX.test(content)) {
    console.log(`[✓] No Bidi characters in: ${filePath}`);
    return;
  }

  if (backup) {
    fs.copyFileSync(filePath, filePath + ".bak");
    console.log(`[↩] Backup created: ${filePath}.bak`);
  }

  const cleaned = content.replace(BIDI_REGEX, "");
  fs.writeFileSync(filePath, cleaned, "utf8");
  console.log(`[✔] Cleaned: ${filePath}`);
}

// 递归遍历目录
function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && fullPath.match(/\.(js|ts|md|json|txt|vue|html|css)$/i)) {
      cleanFile(fullPath);
    }
  }
}

// CLI 入口
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: node removeBidiChars.js <file-or-directory-path>");
  process.exit(1);
}

const targetPath = args[0];
const stat = fs.statSync(targetPath);

if (stat.isDirectory()) {
  scanDir(targetPath);
} else {
  cleanFile(targetPath);
}