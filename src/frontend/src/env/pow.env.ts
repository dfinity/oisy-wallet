// TODO remove this hardocded assignement once VITE_POW_FEATURE_ENABLED is correctly set in github
export const POW_FEATURE_ENABLED = false;

// TODO enable this feature flag evaluation logic once VITE_POW_FEATURE_ENABLED is set in github
// export const POW_FEATURE_ENABLED = parseBoolEnvVar(import.meta.env.VITE_POW_FEATURE_ENABLED);

export const POW_CHALLENGE_INTERVAL_MILLIS = 120000;
