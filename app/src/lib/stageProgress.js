export function nextStage(stages, current) {
  const index = stages.findIndex((stage) => stage.id === current);
  return index >= 0 ? stages[index + 1] || null : null;
}
