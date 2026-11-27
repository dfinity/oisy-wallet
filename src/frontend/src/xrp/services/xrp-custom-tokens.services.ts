import type { CustomToken as BackendCustomToken } from '$declarations/backend/backend.did';
import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import { xrpCustomTokensStore } from '$xrp/stores/xrp-custom-tokens.store';
import type { XrpTrustLineCustomToken } from '$xrp/types/xrp-trust-line-token';
import { toXrpTrustLineToken } from '$xrp/utils/xrp-trust-line-tokens.utils';
import { fromNullable, nonNullish, queryAndUpdate } from '@dfinity/utils';
import { get } from 'svelte/store';

const toXrpCustomTokens = (tokens: BackendCustomToken[]): XrpTrustLineCustomToken[] =>
	tokens.reduce<XrpTrustLineCustomToken[]>((acc, { token, enabled, version }) => {
		if (!('XrpTrustLineMainnet' in token)) {
			return acc;
		}

		const versionNonNullable = fromNullable(version);

		acc.push({
			...toXrpTrustLineToken({
				identity: token.XrpTrustLineMainnet,
				network: XRP_MAINNET_NETWORK
			}),
			enabled,
			...(nonNullish(versionNonNullable) && { version: versionNonNullable })
		});

		return acc;
	}, []);

const onUpdateError = ({ error: err }: { error: unknown }) => {
	// The previous list stays: dropping it would read every hidden token's line as one without an
	// entry, and show it again.
	toastsError({
		msg: { text: get(i18n).init.error.xrp_custom_tokens },
		err
	});
};

export const processCustomTokens = async ({
	tokens,
	certified,
	...params
}: LoadCustomTokenParams): Promise<void> => {
	try {
		const backendTokens = tokens ?? (await loadNetworkCustomTokens({ ...params, certified }));

		xrpCustomTokensStore.set({ tokens: toXrpCustomTokens(backendTokens), certified });
	} catch (err: unknown) {
		if (certified) {
			onUpdateError({ error: err });
		}
	}
};

export const loadCustomTokens = ({
	identity
}: Pick<LoadCustomTokenParams, 'identity'>): Promise<void> =>
	queryAndUpdate<BackendCustomToken[]>({
		request: ({ certified }) => loadNetworkCustomTokens({ identity, certified }),
		onLoad: ({ response, certified }) =>
			xrpCustomTokensStore.set({ tokens: toXrpCustomTokens(response), certified }),
		onUpdateError,
		identity
	});
