<script lang="ts">
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { loadTransactions } from '$eth/services/transactions.services';
	import { enabledErc20Tokens, tokens } from '$lib/derived/tokens.derived';
	import type { TokenId } from '$lib/types/token';
	import type { ResultSuccess } from '$lib/types/utils';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { debounce } from '@dfinity/utils';

	// let tokensAlreadyLoaded: Record<TokenId, boolean> = {};

	let tokensLoaded: TokenId[] = [];

	const load = async () => {
		// const { tokensLoaded, promises } = [...$enabledEthereumTokens, ...$enabledErc20Tokens].reduce<{
		// 	tokensLoaded: Record<TokenId, boolean>;
		// 	promises: Promise<ResultSuccess>[];
		// }>(
		// 	(acc, { network: { id: networkId }, id: tokenId }) => {
		// 		if (tokensLoaded[tokenId]) {
		// 			return acc;
		// 		}
		//
		// 		if (!isNetworkIdEthereum(networkId)) {
		// 			return acc;
		// 		}
		//
		// 		acc = {
		// 			tokensLoaded: { ...acc.tokensLoaded, [tokenId]: false },
		// 			promises: [...acc.promises, loadTransactions({ tokenId, networkId })]
		// 		};
		//
		// 		return acc;
		// 	},
		// 	{ tokensLoaded: tokensAlreadyLoaded, promises: [] }
		// );
		//
		// tokensAlreadyLoaded = tokensLoaded;
		//
		// await Promise.allSettled(promises);

		console.log('tokensLoaded0', tokensLoaded);

		const loadTokens = (): Promise<{ tokenId: TokenId; success: boolean }>[] =>
			[...$enabledEthereumTokens, ...$enabledErc20Tokens].map(
				async ({ network: { id: networkId }, id: tokenId }) => {
					if (tokensLoaded.includes(tokenId)) {
						return { tokenId, success: false };
					}


					if (!isNetworkIdEthereum(networkId)) {
						return { tokenId, success: true };
					}


					const { success } = await loadTransactions({ tokenId, networkId });

					return { tokenId, success };
				}
			);

		tokensLoaded = (await Promise.allSettled(loadTokens())).flatMap((result) =>
			result.status === 'fulfilled' && result.value.success ? [result.value.tokenId] : []
		);

		console.log('tokensLoaded', tokensLoaded);
	};


	const debounceLoad = debounce(load, 500);

	$: $enabledEthereumTokens, $enabledErc20Tokens, debounceLoad();
</script>

<slot />
