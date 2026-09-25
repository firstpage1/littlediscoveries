import fs from "node:fs";

const taxonomy = JSON.parse(fs.readFileSync("config/taxonomy.json", "utf8"));
const allowedAreas = new Set(taxonomy.areas.map(x => x.id));
const allowedAges = new Set(taxonomy.ageGroups.map(x => x.id));
const allowedStatuses = new Set(["candidate","approved","rejected","published","expired"]);

function read(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function fail(message) {
  console.error("ERROR:", message);
  process.exitCode = 1;
}

function validateActivity(a, where) {
  const required = ["id","slug","title","status","areas","ageGroups","category","isFree","sourceUrl","startDate","endDate","lastVerifiedAt"];
  for (const key of required) {
    if (a[key] === undefined || a[key] === null || a[key] === "") {
      fail(`${where}: missing required field "${key}"`);
    }
  }

  if (!allowedStatuses.has(a.status)) fail(`${where}: invalid status "${a.status}"`);
  if (!Array.isArray(a.areas) || a.areas.length === 0) fail(`${where}: areas must be non-empty`);
  if (!Array.isArray(a.ageGroups) || a.ageGroups.length === 0) fail(`${where}: ageGroups must be non-empty`);

  for (const area of a.areas || []) {
    if (!allowedAreas.has(area)) fail(`${where}: invalid area "${area}"`);
  }
  for (const age of a.ageGroups || []) {
    if (!allowedAges.has(age)) fail(`${where}: invalid age group "${age}"`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug || "")) {
    fail(`${where}: invalid slug "${a.slug}"`);
  }

  for (const key of ["sourceUrl","imageUrl"]) {
    if (!a[key]) continue;
    try { new URL(a[key]); } catch { fail(`${where}: ${key} must be a valid URL`); }
  }

  const start = new Date(`${a.startDate}T00:00:00Z`);
  const end = new Date(`${a.endDate}T00:00:00Z`);
  if (Number.isNaN(start.valueOf())) fail(`${where}: invalid startDate`);
  if (Number.isNaN(end.valueOf())) fail(`${where}: invalid endDate`);
  if (!Number.isNaN(start.valueOf()) && !Number.isNaN(end.valueOf()) && end < start) {
    fail(`${where}: endDate is before startDate`);
  }
}

function validateCollection(name, items) {
  const ids = new Set();
  const slugs = new Set();

  items.forEach((a, index) => {
    const where = `${name}[${index}]`;
    validateActivity(a, where);
    if (ids.has(a.id)) fail(`${where}: duplicate id "${a.id}"`);
    if (slugs.has(a.slug)) fail(`${where}: duplicate slug "${a.slug}"`);
    ids.add(a.id);
    slugs.add(a.slug);
  });
}

const current = read("content/current/activities.json");
const next = read("content/next/candidates.json");

validateCollection("current.activities", current.activities || []);
validateCollection("next.candidates", next.candidates || []);

const approved = (next.candidates || []).filter(a => a.status === "approved");
const paidApproved = approved.filter(a => !a.isFree);
const editorChoices = approved.filter(a => a.editorsChoice);

if (paidApproved.length > 2) {
  fail(`next candidates: ${paidApproved.length} approved paid activities; default maximum is 2`);
}
if (editorChoices.length > 6) {
  fail(`next candidates: ${editorChoices.length} Editor's Choice items; maximum is 6`);
}

if (!process.exitCode) {
  console.log(`OK: ${current.activities?.length || 0} current activities, ${next.candidates?.length || 0} next-week candidates.`);
}
