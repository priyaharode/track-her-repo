/* ─────────────────────────────────────────────
   CYCLE UTILITY FUNCTIONS
───────────────────────────────────────────── */

// Get today's date as "YYYY-MM-DD"
export const getTodayStr = () => new Date().toISOString().split("T")[0];

// Calculate cycle day from last period date
export const getCycleDay = (lastPeriodDate, cycleLength = 28) => {
  if (!lastPeriodDate) return null;
  const last = new Date(lastPeriodDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
  // Wrap around if more than one cycle has passed
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
  const follicularEnd = Math.round(cycleLength * 0.43); // ~12 for 28 day
  const ovulationEnd = Math.round(cycleLength * 0.54); // ~15 for 28 day
  if (cycleDay <= periodEnd) return "period";
  if (cycleDay <= follicularEnd) return "follicular";
  if (cycleDay <= ovulationEnd) return "ovulation";
  return "luteal";
};

// Calculate PMS risk % based on cycle day
export const getPMSRisk = (cycleDay, cycleLength = 28) => {
  if (!cycleDay) return 0;
  const lutealStart = Math.round(cycleLength * 0.54) + 1; // day 16 for 28
  const daysInLuteal = cycleLength - lutealStart + 1;
  if (cycleDay < lutealStart) return 10; // low risk outside luteal
  const lutealDay = cycleDay - lutealStart + 1;
  // Risk increases as you get closer to period
  const risk = Math.round(10 + (lutealDay / daysInLuteal) * 80);
  return Math.min(risk, 95);
};

// Get a human-readable phase label + tip
export const getPhaseInfo = (phase) => {
  const info = {
    period: {
      label: "Menstrual",
      tip: "Rest and replenish. Iron-rich foods and warmth help most right now.",
      emoji: "🔴",
    },
    follicular: {
      label: "Follicular",
      tip: "Energy is rising. Great time for new projects and social plans.",
      emoji: "🌱",
    },
    ovulation: {
      label: "Ovulation",
      tip: "Peak energy and confidence. You're at your most magnetic right now.",
      emoji: "✨",
    },
    luteal: {
      label: "Luteal",
      tip: "Slow down and prepare. Cravings and mood shifts are completely normal.",
      emoji: "🌙",
    },
    unknown: {
      label: "Unknown",
      tip: "Log your last period to see your phase.",
      emoji: "❓",
    },
  };
  return info[phase] || info.unknown;
};