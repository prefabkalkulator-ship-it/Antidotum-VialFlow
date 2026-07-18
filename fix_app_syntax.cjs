
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

// Fix line 105 syntax error
content = content.replace(
  "  const mockHandleScan =\n    try {",
  "  const mockHandleScan = async (childId: string) => {\n    try {"
);

// Close the function at the end
content = content.replace(
  "    setScanningMap(prev => ({...prev, [childId]: false}));\n  };\n\n  const mockHandleScan = async (childId: string) => {\n    try {",
  "    setScanningMap(prev => ({...prev, [childId]: false}));\n  };\n\n  const mockHandleScan = async (childId: string) => {\n    try {"
);
// Wait, my regex earlier just did this:
/*
  const handleScanClick = ...
  const mockHandleScan =
    try {
      ...
*/
// It means I literally replaced "const handleScan = async (childId: string) => {\n      setScanningMap(..." with "... \n  const mockHandleScan ="
// So the try catch is actually part of mockHandleScan but it doesn't have the `(childId) => {` and it's missing the closing `}`!
// Actually, earlier it was:
/*
  const handleScan = async (childId: string) => {
    setScanningMap...
    try { ... } catch { ... }
    setScanningMap...
  };
*/
// If I replaced `const handleScan = ... setScanningMap` with `const mockHandleScan =`, then the `try` block is floating!
// Let's fix it properly.

// First, find the exact string.
// I will just use regex to fix it
content = content.replace(
  "  const mockHandleScan =\n      try {",
  "  const mockHandleScan = async (childId: string) => {\n      try {"
);

content = content.replace(
  "      setScanningMap(prev => ({...prev, [childId]: false}));\n    };\n\n  const mockHandleScan =\n      try {",
  "      setScanningMap(prev => ({...prev, [childId]: false}));\n    };\n\n  const mockHandleScan = async (childId: string) => {\n      setScanningMap(prev => ({...prev, [childId]: true}));\n      try {"
);

content = content.replace(
  "  const mockHandleScan =\n    try {",
  "  const mockHandleScan = async (childId: string) => {\n    setScanningMap(prev => ({...prev, [childId]: true}));\n    try {"
);

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("Syntax fixed.");

