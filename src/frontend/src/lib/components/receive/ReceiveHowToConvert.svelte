<script lang="ts">
	import EthFeeStoreContext from '$eth/components/fee/EthFeeStoreContext.svelte';
	import { nativeEthereumTokenWithFallback } from '$eth/derived/token.derived';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import HowToConvertEthereumModal from '$icp/components/convert/HowToConvertEthereumModal.svelte';
	import type { ReceiveHowToConvertData } from '$lib/types/receive';

	interface Props {
		data: ReceiveHowToConvertData;
	}

	let { data }: Props = $props();

	let { sourceToken, destinationToken } = $derived(data);

	// The fees of the conversion are paid in the native token of the twin's network: ETH or SepoliaETH.
	let feeToken = $derived(
		$enabledEthereumTokens.find(({ network: { id } }) => id === sourceToken.network.id) ??
			$nativeEthereumTokenWithFallback
	);
</script>

<EthFeeStoreContext token={feeToken}>
	<HowToConvertEthereumModal {destinationToken} {sourceToken} />
</EthFeeStoreContext>
