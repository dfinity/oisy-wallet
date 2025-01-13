<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { showZeroBalances } from '$lib/derived/settings.derived';
	import type { TokenUi } from '$lib/types/token';
	import type { TokenUiOrGroupUi } from '$lib/types/token-group';
	import { groupTokensByTwin, isTokenUiGroup } from '$lib/utils/token-group.utils';

	// We start it as undefined to avoid showing an empty list before the first update.
	export let tokens: TokenUiOrGroupUi[] | undefined = undefined;

	let groupedTokens: TokenUiOrGroupUi[];
	$: groupedTokens = groupTokensByTwin($combinedDerivedSortedNetworkTokensUi);

	let sortedTokensOrGroups: TokenUiOrGroupUi[];
	$: {
		const hasBalance = (token: TokenUiOrGroupUi) => {
			const checks = [
				() => Number(token.balance ?? 0n) !== 0,
				() => token.usdBalance && token.usdBalance !== 0,
				() => $showZeroBalances
			];

			return checks.some((check) => check());
		};

		sortedTokensOrGroups = groupedTokens.filter((t: TokenUiOrGroupUi) =>
			isTokenUiGroup(t) ? t.tokens.some((tok: TokenUi) => hasBalance(tok)) : hasBalance(t)
		);
	}

	const updateTokensToDisplay = () => (tokens = [...sortedTokensOrGroups]);

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$: sortedTokensOrGroups, debounceUpdateTokensToDisplay();
</script>

<slot />
