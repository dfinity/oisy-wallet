<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// A fee as if it had loaded, so the review's Approve depends on nothing but what is under test.
	const { feeStore } = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	feeStore.setFee({
		maxFeePerGas: 1_000_000_000n,
		maxPriorityFeePerGas: 100_000_000n,
		gas: 250_000n
	});
</script>

{@render children()}
