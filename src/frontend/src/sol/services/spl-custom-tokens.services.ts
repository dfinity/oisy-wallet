import type { CustomToken } from '$declarations/backend/backend.did';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import type { TokenId } from '$lib/types/token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { isNetworkIdSOLDevnet, isNetworkIdSOLMainnet } from '$lib/utils/network.utils';
import { get as getStorage, set as setStorage } from '$lib/utils/storage.utils';
import { loadCustomTokens, loadCustomTokensWithMetadata } from '$sol/services/spl.services';
import {
	SPL_CUSTOM_TOKENS_KEY,
	splCustomTokensStore,
	type SplAddressMap
} from '$sol/stores/spl-custom-tokens.store';
import type { SplTokenAddress } from '$sol/types/spl';
import type { SaveSplCustomToken } from '$sol/types/spl-custom-token';
import type { Identity } from '@dfinity/agent';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const saveCustomTokens = async ({
	progress,
	identity,
	tokens
}: {
	progress: (step: ProgressStepsAddToken) => void;
	identity: Identity;
	tokens: SaveSplCustomToken[];
}) => {
	progress(ProgressStepsAddToken.SAVE);

	const savedAddresses: SplTokenAddress[] = (
		await loadCustomTokensWithMetadata({
			identity
		})
	).map(({ address }) => address);

	const [enabledNewAddresses, disabledNewAddresses] = tokens.reduce<
		[SplTokenAddress[], SplTokenAddress[]]
	>(
		([accEnabled, accDisabled], { address, enabled, network: { id: networkId } }) =>
			isNetworkIdSOLMainnet(networkId)
				? [
						[...accEnabled, ...(enabled ? [address] : [])],
						[...accDisabled, ...(!enabled ? [address] : [])]
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

	const oldValues = getStorage<SplAddressMap>({ key: SPL_CUSTOM_TOKENS_KEY });

	setStorage({
		key: SPL_CUSTOM_TOKENS_KEY,
		value: {
			...oldValues,
			[identity.getPrincipal().toText()]: tokenAddresses
		}
	});

	const customTokens: CustomToken[] = tokens.map((token) =>
		toCustomToken({
			...token,
			networkKey: isNetworkIdSOLDevnet(token.network.id) ? 'SplDevnet' : 'SplMainnet'
		})
	);

	await setManyCustomTokens({
		identity,
		tokens: customTokens,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	progress(ProgressStepsAddToken.UPDATE_UI);

	// Hide tokens that have been disabled
	const disabledTokens = tokens.filter(({ enabled, id }) => !enabled && nonNullish(id));
	disabledTokens.forEach(({ id }) => splCustomTokensStore.reset(id as TokenId));

	// Reload all user tokens for simplicity reason.
	await loadCustomTokens({ identity });
};
