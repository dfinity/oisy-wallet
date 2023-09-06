import { addressStore } from '$lib/stores/address.store';
import { authStore, type AuthSignInParams } from '$lib/stores/auth.store';
import { balancesStore } from '$lib/stores/balances.store';
import { busy } from '$lib/stores/busy.store';
import { erc20TokensStore } from '$lib/stores/erc20.store';
import { metamaskStore } from '$lib/stores/metamask.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import { transactionsStore } from '$lib/stores/transactions.store';

const resetStores = () => {
	addressStore.reset();
	balancesStore.reset();
	transactionsStore.reset();
	erc20TokensStore.reset();
	metamaskStore.reset();

	busy.stop();
};

export const signIn = async (
	params: AuthSignInParams
): Promise<{ success: 'ok' | 'cancelled' | 'error'; err?: unknown }> => {
	busy.show();

	try {
		await authStore.signIn(params);

		return { success: 'ok' };
	} catch (err: unknown) {
		if (err === 'UserInterrupt') {
			// We do not display an error if user explicitly cancelled the process of sign-in
			return { success: 'cancelled' };
		}

		toastsError({
			msg: { text: `Something went wrong while sign-in.` },
			err
		});

		return { success: 'error', err };
	} finally {
		busy.stop();
	}
};

export const signOut = async () => {
	await authStore.signOut();

	resetStores();
};

export const idleSignOut = async () => {
	await signOut();

	toastsShow({
		text: 'You have been logged out because your session has expired.',
		level: 'warn'
	});
};
