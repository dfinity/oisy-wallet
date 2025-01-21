import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { get as getStorage } from '$icp/utils/storage.utils';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { ResultSuccess } from '$lib/types/utils';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import { SPL_USER_TOKENS_KEY, splUserTokensStore } from '$sol/stores/spl-user-tokens.store';
import type { SplTokenAddress } from '$sol/types/spl';
import type { SplUserToken } from '$sol/types/spl-user-token';
import { get } from 'svelte/store';

export const loadSplTokens = async ({ identity }: { identity: OptionIdentity }): Promise<void> => {
	await Promise.all([loadDefaultSplTokens(), loadUserTokens({ identity })]);
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

export const loadUserTokens = ({ identity }: { identity: OptionIdentity }): Promise<void> =>
	queryAndUpdate<SplUserToken[]>({
		request: () => loadSplUserTokens(),
		onLoad: loadSplUserTokenData,
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

export const loadSplUserTokens = async (): Promise<SplUserToken[]> => {
	// TODO: use the backend method when we add the SPL tokens to the backend, similar to ERC20
	const loadUserContracts = async (): Promise<SplTokenAddress[]> => {
		const contracts: SplTokenAddress[] =
			getStorage<SplTokenAddress[]>({ key: SPL_USER_TOKENS_KEY }) ?? [];

		return await Promise.resolve(contracts);
	};

	const contracts = await loadUserContracts();
	return SPL_TOKENS.filter((token) => contracts.includes(token.address)).map((token) => ({
		...token,
		enabled: true
	}));
};

const loadSplUserTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: SplUserToken[];
}) => {
	splUserTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};
