import { token as tokenStore } from '$lib/stores/token.store';
import type { Token } from '$lib/types/token';

export const loadTokenAndRun = async ({
	token,
	callback
}: {
	token: Token;
	callback: () => Promise<void>;
}) => {
	tokenStore.set(token);
	await callback();
};

export const runAndResetToken = (callback: () => void) => {
	callback();
	tokenStore.set(null);
};
