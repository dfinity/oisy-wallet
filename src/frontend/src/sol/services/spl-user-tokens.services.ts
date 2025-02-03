import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { get as getStorage, set as setStorage } from '$lib/utils/storage.utils';
import { loadSplUserTokens, loadUserTokens } from '$sol/services/spl.services';
import {
	SPL_USER_TOKENS_KEY,
	splUserTokensStore,
	type SplAddressMap
} from '$sol/stores/spl-user-tokens.store';
import type { SplTokenAddress } from '$sol/types/spl';
import type { Identity } from '@dfinity/agent';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const saveUserTokens = async ({
	progress,
	identity,
	tokens
}: {
	progress: (step: ProgressStepsAddToken) => void;
	identity: Identity;
	tokens: SaveCustomTokenWithKey[];
}) => {
	progress(ProgressStepsAddToken.SAVE);

	const savedAddresses: SplTokenAddress[] = (
		await loadUserTokens({
			identity
		})
	).map(({ address }) => address);

	const [enabledNewAddresses, disabledNewAddresses] = tokens.reduce<
		[SplTokenAddress[], SplTokenAddress[]]
	>(
		([accEnabled, accDisabled], token) =>
			token.networkKey === 'SplMainnet'
				? [
						[...accEnabled, ...(token.enabled ? [token.address] : [])],
						[...accDisabled, ...(!token.enabled ? [token.address] : [])]
					]
				: [accEnabled, accDisabled],
		[[], []]
	);

	const tokenAddresses = Array.from(
		new Set([
			...savedAddresses.filter((address) => !disabledNewAddresses.includes(address)),
			...enabledNewAddresses
		])
	);

	const oldValues = getStorage<SplAddressMap>({ key: SPL_USER_TOKENS_KEY });

	setStorage({
		key: SPL_USER_TOKENS_KEY,
		value: {
			...oldValues,
			[identity.getPrincipal().toText()]: tokenAddresses
		}
	});

	await setManyCustomTokens({
		identity,
		tokens: tokens.map(toCustomToken),
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	progress(ProgressStepsAddToken.UPDATE_UI);

	// Hide tokens that have been disabled
	const disabledTokens = tokens.filter(({ enabled }) => !enabled);
	const splUserTokens = get(splUserTokensStore);
	if (nonNullish(splUserTokens)) {
		disabledTokens.forEach((token) => {
			if (token.networkKey !== 'SplMainnet') {
				return;
			}

			const existingToken = splUserTokens.find(
				({ data: { address } }) => address === token.address
			)?.data;

			if (nonNullish(existingToken)) {
				splUserTokensStore.reset(existingToken.id);
			}
		});
	}

	// Reload all user tokens for simplicity reason.
	await loadSplUserTokens({ identity });
};
