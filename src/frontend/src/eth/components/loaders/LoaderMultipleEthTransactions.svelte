<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { loadTransactions } from '$eth/services/transactions.services';
	import { enabledErc20Tokens } from '$lib/derived/tokens.derived';

	const load = async () => {
		await Promise.allSettled(
			[...$enabledEthereumTokens, ...$enabledErc20Tokens].map(
				async ({ network: { id: networkId }, id: tokenId }) => {
					await loadTransactions({ tokenId, networkId });
				}
			)
		);
	};

	const debounceLoad = debounce(load, 500);

	$: $enabledEthereumTokens, $enabledErc20Tokens, debounceLoad();
</script>

<slot />
