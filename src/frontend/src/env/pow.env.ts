export const POW_ENABLED = JSON.parse(import.meta.env.VITE_POW_ENABLED ?? false) === true;
export const POW_CHALLENGE_INTERVAL_MILLIS: number = JSON.parse(
	import.meta.env.VITE_POW_CHALLENGE_INTERVALL_MILLIS ?? 120000
);
