import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { ResultSuccess } from '$lib/types/utils';
import { get as getStorage } from '$lib/utils/storage.utils';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import {
	SPL_USER_TOKENS_KEY,
	splUserTokensStore,
	type SplAddressMap
} from '$sol/stores/spl-user-tokens.store';
import type { SplTokenAddress } from '$sol/types/spl';
import type { SplUserToken } from '$sol/types/spl-user-token';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadSplTokens = async ({ identity }: { identity: OptionIdentity }): Promise<void> => {
	await Promise.all([loadDefaultSplTokens(), loadSplUserTokens({ identity })]);
};

const loadDefaultSplTokens = (): ResultSuccess => {
	try {
		splDefaultTokensStore.set(SPL_TOKENS);
	} catch (err: unknown) {
		splDefaultTokensStore.reset();

		toastsError({
			msg: { text: get(i18n).init.error.spl_contract },
			err
		});

		return { success: false };
	}

	return { success: true };
};

export const loadSplUserTokens = ({ identity }: { identity: OptionIdentity }): Promise<void> =>
	queryAndUpdate<SplUserToken[]>({
		request: () => loadUserTokens({ identity }),
		onLoad: loadUserTokenData,
		onCertifiedError: ({ error: err }) => {
			splUserTokensStore.resetAll();

			toastsError({
				msg: { text: get(i18n).init.error.spl_user_tokens },
				err
			});
		},
		identity,
		strategy: 'query'
	});

export const loadUserTokens = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<SplUserToken[]> => {
	// TODO: use the backend method when we add the SPL tokens to the backend, similar to ERC20
	const loadUserContracts = async (): Promise<SplTokenAddress[]> => {
		if (isNullish(identity)) {
			await nullishSignOut();
			return await Promise.resolve([]);
		}

		const contractsMap: SplAddressMap =
			getStorage<SplAddressMap>({ key: SPL_USER_TOKENS_KEY }) ?? {};
		const principal = identity.getPrincipal().toString();
		const contracts = nonNullish(principal) ? (contractsMap[principal] ?? []) : [];

		return await Promise.resolve(contracts);
	};

	const contracts = await loadUserContracts();
	return SPL_TOKENS.filter((token) => contracts.includes(token.address)).map((token) => ({
		...token,
		enabled: true
	}));
};

const loadUserTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: SplUserToken[];
}) => {
	splUserTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};
