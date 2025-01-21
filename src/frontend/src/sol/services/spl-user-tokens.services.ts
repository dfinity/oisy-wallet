import { get as getStorage, set as setStorage } from '$icp/utils/storage.utils';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { loadUserTokens } from '$sol/services/spl.services';
import { SPL_USER_TOKENS_KEY, splUserTokensStore } from '$sol/stores/spl-user-tokens.store';
import type { SplTokenAddress } from '$sol/types/spl';
import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';
import type { Identity } from '@dfinity/agent';
import { nonNullish } from '@dfinity/utils';

export const saveUserTokens = async ({
	progress,
	identity,
	tokens
}: {
	progress: (step: ProgressStepsAddToken) => void;
	identity: Identity;
	tokens: SplTokenToggleable[];
}) => {
	progress(ProgressStepsAddToken.SAVE);

	const savedAddresses: SplTokenAddress[] =
		getStorage<SplTokenAddress[]>({ key: SPL_USER_TOKENS_KEY }) ?? [];

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

	setStorage({
		key: SPL_USER_TOKENS_KEY,
		value: tokenAddresses
	});

	progress(ProgressStepsAddToken.UPDATE_UI);

	// Hide tokens that have been disabled
	const disabledTokens = tokens.filter(({ enabled, id }) => !enabled && nonNullish(id));
	disabledTokens.forEach(({ id }) => splUserTokensStore.reset(id));

	// Reload all user tokens for simplicity reason.
	await loadUserTokens({ identity });
};
