const PLAUSIBLE_PACKAGE_NAME = '@plausible-analytics/tracker';

export const loadPlausibleTracker = async () => await import(PLAUSIBLE_PACKAGE_NAME);
