import { getAirdropCode, redeemAirdropCode } from '$lib/api/airdrop.api';
import { airdropCode } from '$lib/derived/airdrop.derived';
import { addressStore } from '$lib/stores/address.store';
import { airdropStore } from '$lib/stores/airdrop.store';
import { toastsError } from '$lib/stores/toasts.store';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const initAirdrop = (): Promise<{ success: boolean }> => {
	const code = get(airdropCode);

	if (nonNullish(code)) {
		return redeemCode(code);
	}

	return loadAirdrop();
};

const redeemCode = async (code: string): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		toastsError({
			msg: { text: 'Address is unknown.' }
		});

		return { success: false };
	}

	try {
		const result = await redeemAirdropCode({ code, address });

		if ('Err' in result) {
			const { Err } = result;

			if ('CannotRegisterMultipleTimes' in Err) {
				// We ignore this error, user might have just clicked "Refresh" in the browser, and proceed further by loading the code.
				return await loadAirdrop();
			}

			throw Error(JSON.stringify(Err));
		}

		const { Ok } = result;

		airdropStore.set(Ok);
	} catch (err: unknown) {
		airdropStore.reset();

		toastsError({
			msg: { text: 'Error while redeeming the airdrop code.' },
			err
		});

		return { success: false };
	}

	return { success: true };
};

const loadAirdrop = async (): Promise<{ success: boolean }> => {
	try {
		const result = await getAirdropCode();

		if ('Err' in result) {
			const { Err } = result;

			if ('CodeNotFound' in Err) {
				airdropStore.set(null);

				return { success: true };
			}

			throw Error(JSON.stringify(Err));
		}

		const { Ok } = result;

		airdropStore.set(Ok);
	} catch (err: unknown) {
		airdropStore.reset();

		toastsError({
			msg: { text: 'Error while loading the airdrop code.' },
			err
		});

		return { success: false };
	}

	return { success: true };
};
