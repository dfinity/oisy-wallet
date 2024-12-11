// TODO: to be removed when the feature is fully implemented
export const SOLANA_NETWORK_ENABLED =
	JSON.parse(import.meta.env.VITE_SOLANA_NETWORK_ENABLED ?? false) === true;
