export const AIRDROP = JSON.parse(import.meta.env.VITE_AIRDROP ?? false) === true;
export const AIRDROP_COMPLETED =
	JSON.parse(import.meta.env.VITE_AIRDROP_COMPLETED ?? false) === true;

export const CODE_TIMER_INTERVAL = 10000;
