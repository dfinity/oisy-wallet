<script lang="ts">
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { loadTransactions } from '$eth/services/transactions.services';
	import { enabledErc20Tokens } from '$lib/derived/tokens.derived';

	const load = async () => {
		if ($erc20UserTokensNotInitialized) {
			return;
		}

		await Promise.allSettled(
			[...$enabledEthereumTokens, ...$enabledErc20Tokens].map(
				async ({ network: { id: networkId }, id: tokenId }) => {
					await loadTransactions({ tokenId, networkId });
				}
			)
		);
	};

	$: $enabledEthereumTokens, $enabledErc20Tokens, $erc20UserTokensNotInitialized, load();
</script>

<slot />
