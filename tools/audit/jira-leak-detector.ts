import fg from "fast-glob";
import fs from "fs";

const JIRA_PATTERNS = [
  "jira/",
  "/jira/",
  "api/jira",
  "JiraClient",
  "useJira",
  "getJira",
  "postJira",
];

async function scanFile(file: string) {
  const content = fs.readFileSync(file, "utf-8");

  return JIRA_PATTERNS.filter((pattern) => content.includes(pattern)).map((pattern) => ({
    file,
    pattern,
  }));
}

async function runAudit() {
  const files = await fg(["apps/**/*.{ts,tsx}", "libs/**/*.{ts,tsx}"]);

  let leaks: any[] = [];

  for (const file of files) {
    const result = await scanFile(file);
    leaks = leaks.concat(result);
  }

  if (leaks.length > 0) {
    console.log("🚨 JIRA LEAKS DETECTED:");
    console.table(leaks);
    process.exit(1);
  }

  console.log("✅ No Jira leaks found");
}

runAudit();
