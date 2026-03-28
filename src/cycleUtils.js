/* ─────────────────────────────────────────────
   CYCLE UTILITY FUNCTIONS
───────────────────────────────────────────── */

export const getTodayStr = () => new Date().toISOString().split("T")[0];

// Calculate cycle day from last period date
export const getCycleDay = (lastPeriodDate, cycleLength = 28) => {
  if (!lastPeriodDate) return null;
  const last = new Date(lastPeriodDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
  return (diffDays % cycleLength) + 1;
};

// Calculate next period date
export const getNextPeriodDate = (lastPeriodDate, cycleLength = 28) => {
  if (!lastPeriodDate) return null;
  const last = new Date(lastPeriodDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
  const cyclesPassed = Math.floor(diffDays / cycleLength);
  const next = new Date(last);
  next.setDate(last.getDate() + (cyclesPassed + 1) * cycleLength);
  return next;
};

// Format date as "Mar 27"
export const formatDate = (date) => {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Days until next period
export const getDaysUntilNextPeriod = (lastPeriodDate, cycleLength = 28) => {
  const next = getNextPeriodDate(lastPeriodDate, cycleLength);
  if (!next) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((next - today) / (1000 * 60 * 60 * 24));
};

// Get phase from cycle day
export const getPhaseFromDay = (cycleDay, cycleLength = 28) => {
  if (!cycleDay) return "unknown";
  const periodEnd = 5;
  const follicularEnd = Math.round(cycleLength * 0.43);
  const ovulationEnd = Math.round(cycleLength * 0.54);
  if (cycleDay <= periodEnd) return "period";
  if (cycleDay <= follicularEnd) return "follicular";
  if (cycleDay <= ovulationEnd) return "ovulation";
  return "luteal";
};

// PMS risk %
export const getPMSRisk = (cycleDay, cycleLength = 28) => {
  if (!cycleDay) return 0;
  const lutealStart = Math.round(cycleLength * 0.54) + 1;
  const daysInLuteal = cycleLength - lutealStart + 1;
  if (cycleDay < lutealStart) return 10;
  const lutealDay = cycleDay - lutealStart + 1;
  return Math.min(Math.round(10 + (lutealDay / daysInLuteal) * 80), 95);
};

// Phase info
export const getPhaseInfo = (phase) => {
  const info = {
    period:     { label: "Menstrual",  tip: "Rest and replenish. Iron-rich foods and warmth help most right now.", emoji: "🔴" },
    follicular: { label: "Follicular", tip: "Energy is rising. Great time for new projects and social plans.", emoji: "🌱" },
    ovulation:  { label: "Ovulation",  tip: "Peak energy and confidence. You're at your most magnetic right now.", emoji: "✨" },
    luteal:     { label: "Luteal",     tip: "Slow down and prepare. Cravings and mood shifts are completely normal.", emoji: "🌙" },
    unknown:    { label: "Unknown",    tip: "Log your last period to see your phase.", emoji: "🌸" },
  };
  return info[phase] || info.unknown;
};

/* ─────────────────────────────────────────────
   SMART CYCLE LENGTH CALCULATOR
   Analyses all period days to find cycle starts
   and calculates average cycle length
───────────────────────────────────────────── */
export const calculateSmartCycleLength = (allLogs) => {
  // Filter only period days, sort ascending
  const periodDates = allLogs
    .filter(log => log.isPeriodDay)
    .map(log => log.date)
    .sort();

  if (periodDates.length < 2) return null; // not enough data

  // Find cycle starts — a new period starts when there's a gap of 10+ days
  const cycleStarts = [];
  let lastDate = null;

  for (const dateStr of periodDates) {
    const d = new Date(dateStr + "T00:00:00");
    if (!lastDate) {
      cycleStarts.push(d);
    } else {
      const gap = Math.floor((d - lastDate) / (1000 * 60 * 60 * 24));
      if (gap >= 10) {
        // This is a new period cycle start
        cycleStarts.push(d);
      }
    }
    lastDate = d;
  }

  if (cycleStarts.length < 2) return null; // only one cycle detected

  // Calculate gaps between cycle starts
  const cycleLengths = [];
  for (let i = 1; i < cycleStarts.length; i++) {
    const gap = Math.floor((cycleStarts[i] - cycleStarts[i - 1]) / (1000 * 60 * 60 * 24));
    if (gap >= 18 && gap <= 45) { // valid cycle range
      cycleLengths.push(gap);
    }
  }

  if (cycleLengths.length === 0) return null;

  // Weighted average — recent cycles count more
  let weightedSum = 0;
  let totalWeight = 0;
  cycleLengths.forEach((len, i) => {
    const weight = i + 1; // more recent = higher index = higher weight
    weightedSum += len * weight;
    totalWeight += weight;
  });

  const avg = Math.round(weightedSum / totalWeight);
  const lastPeriodDate = cycleStarts[cycleStarts.length - 1].toISOString().split("T")[0];
  const periodDuration = calculateAveragePeriodDuration(periodDates, cycleStarts);

  return {
    cycleLength: avg,
    lastPeriodDate,
    periodDuration,
    cyclesAnalysed: cycleStarts.length - 1,
    confidence: Math.min(Math.round((cycleLengths.length / 3) * 100), 99),
  };
};

// Calculate average period duration from logged data
const calculateAveragePeriodDuration = (periodDates, cycleStarts) => {
  if (cycleStarts.length < 1) return 5;
  const durations = [];
  for (const start of cycleStarts) {
    let count = 0;
    for (const dateStr of periodDates) {
      const d = new Date(dateStr + "T00:00:00");
      const diff = Math.floor((d - start) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= 10) count++;
    }
    if (count > 0) durations.push(count);
  }
  if (durations.length === 0) return 5;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
};