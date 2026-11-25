<script lang="ts">
	import SwapReviewDestination from '$lib/components/swap/SwapReviewDestination.svelte';

	// Shows what the destination holds back, which Review reads through the binding.
	let swapBlocked = $state(false);
</script>

<SwapReviewDestination bind:swapBlocked />

<span data-tid="swap-blocked">{swapBlocked}</span>
