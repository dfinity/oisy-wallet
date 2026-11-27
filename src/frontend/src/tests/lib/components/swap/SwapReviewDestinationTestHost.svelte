<script lang="ts">
	import SwapReviewDestination from '$lib/components/swap/SwapReviewDestination.svelte';

	// Shows what the destination holds back, which Review reads through the binding, around a
	// stand-in for the fees Review passes in.
	let swapBlocked = $state(false);
</script>

<SwapReviewDestination bind:swapBlocked>
	<span data-tid="swap-fees">fees</span>
</SwapReviewDestination>

<span data-tid="swap-blocked">{swapBlocked}</span>
