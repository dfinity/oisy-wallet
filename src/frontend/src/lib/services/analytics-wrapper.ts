const PLAUSIBLE_PACKAGE_NAME = '@plausible-analytics/tracker' as const;

export const loadPlausibleTracker = async () => await import(PLAUSIBLE_PACKAGE_NAME);
