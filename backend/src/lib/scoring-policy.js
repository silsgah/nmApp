export function assertScoreWithinBounds(score, maximum) {
  if (!Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0 || score < 0 || score > maximum) {
    throw new RangeError(`Score must be between 0 and ${maximum}`);
  }
  return score;
}

export function aggregateExaminerScores(scores, method = 'AVERAGE') {
  if (!Array.isArray(scores) || scores.length === 0) return 0;
  const values = scores.map(Number);
  if (values.some((value) => !Number.isFinite(value))) throw new TypeError('All examiner scores must be finite numbers');
  if (method === 'SUM') return values.reduce((total, value) => total + value, 0);
  if (method === 'HIGHEST') return Math.max(...values);
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function combineWeightedTaskPercentages(attempts) {
  if (!Array.isArray(attempts) || attempts.length === 0) return 0;
  const totalWeight = attempts.reduce((total, attempt) => total + Number(attempt.weight), 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) throw new RangeError('Task weights must total more than zero');
  return attempts.reduce((total, attempt) => {
    const percentage = Number(attempt.percentage);
    const weight = Number(attempt.weight);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100 || !Number.isFinite(weight) || weight < 0) {
      throw new RangeError('Invalid task percentage or weight');
    }
    return total + percentage * weight;
  }, 0) / totalWeight;
}
