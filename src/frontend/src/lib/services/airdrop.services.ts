import { getAirdropCode } from '$lib/api/airdrop.api';
import { airdropStore } from '$lib/stores/airdrop.store';
import { toastsError } from '$lib/stores/toasts.store';

export const loadAirdrop = async (): Promise<{ success: boolean }> => {
	try {
		const result = await getAirdropCode();

		if ('Err' in result) {
			const { Err } = result;

			if ('CodeNotFound' in Err) {
				airdropStore.set(null);
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
