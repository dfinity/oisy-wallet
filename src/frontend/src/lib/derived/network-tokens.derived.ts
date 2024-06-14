import { buildIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
import { selectedNetwork } from '$lib/derived/network.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { ManageableToken, Token } from '$lib/types/token';
import { isNetworkIdChainFusion } from '$lib/utils/network.utils';
import { mergeTokenLists } from '$lib/utils/token.utils';
import { derived, type Readable } from 'svelte/store';

export const networkTokens: Readable<Token[]> = derived(
	[tokens, selectedNetwork],
	([$tokens, $selectedNetwork]) =>
		$tokens.filter((token) => {
			const {
				network: { id, env }
			} = token;

			// TODO: extract Chain Fusion logic to a utility maybe?
			return (
				(isNetworkIdChainFusion($selectedNetwork.id) &&
					env === $selectedNetwork.env &&
					!isTokenIcrcTestnet(token)) ||
				id === $selectedNetwork.id
			);
		})
);

export const manageableNetworkTokens: Readable<ManageableToken[]> = derived(
	[networkTokens],
	([$networkTokens]) => {
		const allIcrcCustomTokens: IcrcCustomToken[] = buildIcrcCustomTokens()
			.map((token) => ({
				...token,
				id: Symbol(token.symbol),
				enabled: false
			}))
			.filter((token) => token.indexCanisterVersion !== 'outdated');
		return mergeTokenLists<ManageableToken>(
			$networkTokens.map((token) => ({ ...token, enabled: true })),
			allIcrcCustomTokens
		);
	}
);
