<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { showZeroBalances } from '$lib/derived/settings.derived';
	import type { TokenUi } from '$lib/types/token';
	import type { TokenUiOrGroupUi } from '$lib/types/token-group';
	import { groupTokensByTwin } from '$lib/utils/token-group.utils';

	// We start it as undefined to avoid showing an empty list before the first update.
	export let tokens: TokenUiOrGroupUi[] | undefined = undefined;

	let sortedTokens: TokenUi[];
	let shuffledTokens: TokenUiOrGroupUi[] = [];

	// Shuffle the sorted tokens
	const shuffleArray = (array: TokenUiOrGroupUi[]): TokenUiOrGroupUi[] => {
		let shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	};

	// Function to reshuffle the tokens
	const reshuffleTokens = () => {
		shuffledTokens = shuffleArray(groupedTokens);
	};

	// Set interval to reshuffle the tokens every 5 seconds
	const interval = setInterval(reshuffleTokens, 5000);

	// Clean up the interval when the component is destroyed
	onDestroy(() => {
		clearInterval(interval);
	});

	// Initialize the first shuffle
	$: sortedTokens, reshuffleTokens();

	$: sortedTokens = $combinedDerivedSortedNetworkTokensUi.filter(
		({ balance, usdBalance }) => Number(balance ?? 0n) || (usdBalance ?? 0) || $showZeroBalances
	);

	let groupedTokens: TokenUiOrGroupUi[];
	$: groupedTokens = groupTokensByTwin(sortedTokens);

	const updateTokensToDisplay = () => (tokens = [...shuffledTokens]);

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$: shuffledTokens, debounceUpdateTokensToDisplay();
</script>

<slot />
