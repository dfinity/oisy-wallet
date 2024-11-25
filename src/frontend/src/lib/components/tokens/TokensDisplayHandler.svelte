<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { showZeroBalances } from '$lib/derived/settings.derived';
	import type { TokenUi } from '$lib/types/token';
	import type { TokenUiGroup } from '$lib/types/token-group';
	import { groupTokens } from '$lib/utils/token-group.utils';

	// We start it as undefined to avoid showing an empty list before the first update.
	export let tokenGroups: TokenUiGroup[] | undefined = undefined;

	let sortedTokens: TokenUi[];
	$: sortedTokens = $combinedDerivedSortedNetworkTokensUi.filter(
		({ balance, usdBalance }) => Number(balance ?? 0n) || (usdBalance ?? 0) || $showZeroBalances
	);

	let groupedTokens: TokenUiGroup[];
	$: groupedTokens = groupTokens(sortedTokens);

	const updateTokensToDisplay = () => (tokenGroups = [...groupedTokens]);

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$: sortedTokens, debounceUpdateTokensToDisplay();
</script>

<slot />
