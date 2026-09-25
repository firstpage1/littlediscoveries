export const DEFAULT_COVERAGE_CONFIG = {
  healthyMinimum: 2,
  priorityHealthyMinimum: 3,
};

export function buildCoverageMatrix(activities, taxonomy, config = DEFAULT_COVERAGE_CONFIG) {
  const matrix = {};
  const priorityAreas = new Set(
    taxonomy.areas.filter(area => area.priorityDepth).map(area => area.id)
  );

  for (const area of taxonomy.areas) {
    matrix[area.id] = {};
    for (const age of taxonomy.ageGroups) {
      matrix[area.id][age.id] = {
        count: 0,
        status: "red",
        activityIds: [],
      };
    }
  }

  for (const activity of activities) {
    if (!["approved", "published"].includes(activity.status)) continue;

    for (const areaId of activity.areas || []) {
      if (!matrix[areaId]) continue;

      for (const ageId of activity.ageGroups || []) {
        if (!matrix[areaId][ageId]) continue;
        matrix[areaId][ageId].count += 1;
        matrix[areaId][ageId].activityIds.push(activity.id);
      }
    }
  }

  for (const area of taxonomy.areas) {
    const target = priorityAreas.has(area.id)
      ? config.priorityHealthyMinimum
      : config.healthyMinimum;

    for (const age of taxonomy.ageGroups) {
      const cell = matrix[area.id][age.id];
      cell.status =
        cell.count === 0 ? "red" :
        cell.count < target ? "amber" :
        "green";
      cell.target = target;
      cell.gap = Math.max(0, target - cell.count);
    }
  }

  return matrix;
}

export function candidateCoverageValue(candidate, matrix) {
  let score = 0;
  const fills = [];

  for (const areaId of candidate.areas || []) {
    for (const ageId of candidate.ageGroups || []) {
      const cell = matrix?.[areaId]?.[ageId];
      if (!cell) continue;

      const value = cell.status === "red" ? 4 : cell.status === "amber" ? 2 : 0;
      score += value;

      if (value > 0) {
        fills.push({
          areaId,
          ageId,
          currentCount: cell.count,
          target: cell.target,
          value,
        });
      }
    }
  }

  return { score, fills };
}

export function coverageSummary(matrix) {
  let red = 0;
  let amber = 0;
  let green = 0;

  for (const area of Object.values(matrix)) {
    for (const cell of Object.values(area)) {
      if (cell.status === "red") red += 1;
      if (cell.status === "amber") amber += 1;
      if (cell.status === "green") green += 1;
    }
  }

  const total = red + amber + green;
  return {
    red,
    amber,
    green,
    total,
    coveredPercent: total === 0 ? 0 : Math.round(((amber + green) / total) * 100),
    healthyPercent: total === 0 ? 0 : Math.round((green / total) * 100),
  };
}
