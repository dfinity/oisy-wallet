<script lang="ts">
	import pLimit from 'p-limit';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { loadTransactions } from '$eth/services/transactions.services';
	import { enabledErc20Tokens } from '$lib/derived/tokens.derived';
	import type { Token, TokenId } from '$lib/types/token';

	// TODO: make it more functional
	let tokensLoaded: TokenId[] = [];


	const load = async () => {
		if ($erc20UserTokensNotInitialized) {
			return;
		}

		const tokens:Token[]=[...$enabledEthereumTokens, ...$enabledErc20Tokens];

		for (let i = 0; i < tokens.length; i++) {
			const { network: { id: networkId }, id: tokenId } = tokens[i];
			if (!tokensLoaded.includes(tokenId)) {
				await loadTransactions({ tokenId, networkId });
				tokensLoaded.push(tokenId);
			}
		}
	};

	$: $enabledEthereumTokens, $enabledErc20Tokens, $erc20UserTokensNotInitialized, load();
</script>

<slot />
