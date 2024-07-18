import { token as tokenStore } from '$lib/stores/token.store';
import type { TokenUi } from '$lib/types/token';

export const loadTokenAndRun = async ({
	token,
	callback
}: {
	token: TokenUi;
	callback: () => Promise<void>;
}) => {
	tokenStore.set(token);
	await callback();
};

export const runAndResetToken = (callback: () => void) => {
	callback();
	tokenStore.set(null);
};
