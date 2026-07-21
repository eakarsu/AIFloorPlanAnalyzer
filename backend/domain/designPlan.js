export function evaluateDesignPlan(input = {}) {
  const errors = [];
  const rooms = Array.isArray(input.rooms) ? input.rooms : [];
  const siteWidthM = Number(input.site?.widthM);
  const siteLengthM = Number(input.site?.lengthM);
  if (!(siteWidthM > 0) || !(siteLengthM > 0)) errors.push('positive site widthM and lengthM are required');
  if (!rooms.length) errors.push('rooms is required');
  let roomAreaM2 = 0;
  const quantities = rooms.map((room) => {
    const widthM = Number(room.widthM);
    const lengthM = Number(room.lengthM);
    if (!room.id || !(widthM > 0) || !(lengthM > 0)) errors.push(`room ${room.id || '?'} requires id and positive dimensions`);
    const areaM2 = Math.max(0, widthM * lengthM);
    roomAreaM2 += areaM2;
    return { roomId: room.id, areaM2, perimeterM: Math.max(0, 2 * (widthM + lengthM)) };
  });
  const siteAreaM2 = Math.max(0, siteWidthM * siteLengthM);
  if (roomAreaM2 > siteAreaM2) errors.push('room area exceeds site area before circulation and wall allowances');
  const costPerM2 = Number(input.costCatalog?.costPerM2);
  if (!(costPerM2 >= 0) || !input.costCatalog?.source || !input.costCatalog?.asOf) errors.push('costCatalog costPerM2, source, and asOf are required');
  const schedule = Array.isArray(input.schedule) ? input.schedule : [];
  const scheduleDays = schedule.reduce((sum, task) => sum + Math.max(0, Number(task.durationDays || 0)), 0);
  const checks = Array.isArray(input.codeChecks) ? input.codeChecks : [];
  if (!checks.length) errors.push('documented codeChecks are required; automated output is not code approval');
  return {
    errors,
    result: {
      quantities,
      siteAreaM2,
      roomAreaM2,
      unallocatedAreaM2: siteAreaM2 - roomAreaM2,
      utilization: siteAreaM2 ? roomAreaM2 / siteAreaM2 : null,
      budgetEstimate: roomAreaM2 * (Number.isFinite(costPerM2) ? costPerM2 : 0),
      sequentialScheduleDays: scheduleDays,
      failedCodeChecks: checks.filter((check) => check.status !== 'pass').map((check) => check.id),
      decision: !errors.length && checks.every((check) => check.status === 'pass') ? 'reviewable' : 'revise'
    },
    assumptions: ['areas are rectangular net room dimensions', 'budget excludes taxes and escalation unless included in catalog'],
    uncertainty: { cadRoundTripVerified: false, permitVerified: false, requiresQualifiedDesigner: true }
  };
}
