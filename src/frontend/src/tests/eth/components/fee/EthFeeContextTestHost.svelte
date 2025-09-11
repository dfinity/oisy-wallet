<script lang="ts">
	import { setContext } from 'svelte';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import { ETH_FEE_CONTEXT_KEY } from '$eth/stores/eth-fee.store';
	import type { EthFeeContextProps } from '$tests/eth/components/fee/EthFeeContextProps';

	interface Props {
		feeStore: { setFee: (v: unknown) => void };
		props: EthFeeContextProps;
	}

	const { feeStore, props }: Props = $props();

	setContext(ETH_FEE_CONTEXT_KEY, { feeStore });
</script>

<EthFeeContext {...props}>Dummy</EthFeeContext>
