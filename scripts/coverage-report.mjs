import fs from "node:fs";
import { buildCoverageMatrix, coverageSummary, candidateCoverageValue } from "../lib/coverage.mjs";

const taxonomy = JSON.parse(fs.readFileSync("config/taxonomy.json", "utf8"));
const current = JSON.parse(fs.readFileSync("content/current/activities.json", "utf8"));
const next = JSON.parse(fs.readFileSync("content/next/candidates.json", "utf8"));

const baseline = [
  ...(current.activities || []).filter(a => a.status === "published"),
  ...(next.candidates || []).filter(a => a.status === "approved"),
];

const matrix = buildCoverageMatrix(baseline, taxonomy);
const summary = coverageSummary(matrix);

console.log(`Coverage: ${summary.coveredPercent}% non-empty; ${summary.healthyPercent}% healthy`);
console.log(`Cells: ${summary.green} green / ${summary.amber} amber / ${summary.red} red\n`);

const areaLabel = Object.fromEntries(taxonomy.areas.map(x => [x.id, x.label]));
const ageLabel = Object.fromEntries(taxonomy.ageGroups.map(x => [x.id, x.label]));

for (const area of taxonomy.areas) {
  const cells = taxonomy.ageGroups.map(age => {
    const c = matrix[area.id][age.id];
    const icon = c.status === "green" ? "G" : c.status === "amber" ? "A" : "R";
    return `${age.id}: ${icon}(${c.count}/${c.target})`;
  });
  console.log(`${area.label}: ${cells.join(" | ")}`);
}

const candidates = (next.candidates || [])
  .filter(a => a.status === "candidate")
  .map(a => ({ activity: a, ...candidateCoverageValue(a, matrix) }))
  .sort((a,b) => b.score - a.score);

if (candidates.length) {
  console.log("\nCandidates with highest coverage value:");
  for (const item of candidates.slice(0, 15)) {
    const gaps = item.fills
      .map(x => `${areaLabel[x.areaId]} / ${ageLabel[x.ageId]}`)
      .join(", ");
    console.log(`- ${item.score.toString().padStart(2)}  ${item.activity.title}${gaps ? ` — fills: ${gaps}` : ""}`);
  }
}
