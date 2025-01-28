import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { TokenId } from '$lib/types/token';
import { get as getStorage, set as setStorage } from '$lib/utils/storage.utils';
import { loadSplUserTokens, loadUserTokens } from '$sol/services/spl.services';
import {
	SPL_USER_TOKENS_KEY,
	splUserTokensStore,
	type SplAddressMap
} from '$sol/stores/spl-user-tokens.store';
import type { SplTokenAddress } from '$sol/types/spl';
import type { SaveSplUserToken } from '$sol/types/spl-user-token';
import type { Identity } from '@dfinity/agent';
import { nonNullish } from '@dfinity/utils';

// TODO: adapt this function when we have the backend ready to save the SPL user tokens
export const saveUserTokens = async ({
	progress,
	identity,
	tokens
}: {
	progress: (step: ProgressStepsAddToken) => void;
	identity: Identity;
	tokens: SaveSplUserToken[];
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
		([accEnabled, accDisabled], { address, enabled }) => [
			[...accEnabled, ...(enabled ? [address] : [])],
			[...accDisabled, ...(!enabled ? [address] : [])]
		],
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

	progress(ProgressStepsAddToken.UPDATE_UI);

	// Hide tokens that have been disabled
	const disabledTokens = tokens.filter(({ enabled, id }) => !enabled && nonNullish(id));
	disabledTokens.forEach(({ id }) => splUserTokensStore.reset(id as TokenId));

	// Reload all user tokens for simplicity reason.
	await loadSplUserTokens({ identity });
};
