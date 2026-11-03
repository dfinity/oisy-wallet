<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import type { EthFeePriority } from '$lib/enums/eth-fee-priority';
	import { observedPriority } from '$tests/eth/components/wallet-connect/eth-fee-context-stub.store';

	interface Props {
		priority?: EthFeePriority;
		children?: Snippet;
	}

	let { priority, children }: Props = $props();

	// The fee the real context would have resolved, so the review it wraps can be approved.
	const { feeStore } = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	feeStore.setFee({
		maxFeePerGas: 1_000_000_000n,
		maxPriorityFeePerGas: 100_000_000n,
		gas: 21_000n
	});

	$effect(() => {
		observedPriority.set(priority);
	});
</script>

{@render children?.()}
