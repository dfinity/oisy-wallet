import { metadata } from '$icp/api/icrc-ledger.api';
import { ICRC_CANISTERS } from '$icp/constants/icrc.constants';
import { icrcTokensStore } from '$icp/stores/icrc.store';
import { mapIcrcToken, type IcrcLoadData } from '$icp/utils/icrc.utils';
import { toastsError } from '$lib/stores/toasts.store';
import { nonNullish } from '@dfinity/utils';

export const loadIcrcTokens = async (): Promise<{ success: boolean }> => {
	try {
		const loadKnownIcrc = (): Promise<IcrcLoadData>[] =>
			ICRC_CANISTERS.map(
				async ({ ledgerCanisterId, ...rest }): Promise<IcrcLoadData> => ({
					...rest,
					ledgerCanisterId,
					metadata: await metadata({ ledgerCanisterId })
				})
			);

		// TODO: extend with user defined ICRC tokens
		const tokens = await Promise.all([...loadKnownIcrc()]);
		icrcTokensStore.set(tokens.map(mapIcrcToken).filter(nonNullish));
	} catch (err: unknown) {
		icrcTokensStore.reset();

		toastsError({
			msg: { text: 'Error while loading the ICRC canisters.' },
			err
		});

		return { success: false };
	}

	return { success: true };
};
