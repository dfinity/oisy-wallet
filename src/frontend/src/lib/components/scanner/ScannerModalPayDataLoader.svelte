<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onDestroy, type Snippet } from 'svelte';
	import AllUtxosLoader from '$btc/components/fee/AllUtxosLoader.svelte';
	import BtcPendingSentTransactionsLoader from '$btc/components/fee/BtcPendingSentTransactionsLoader.svelte';
	import FeeRatePercentilesLoader from '$btc/components/fee/FeeRatePercentilesLoader.svelte';
	import { enabledMainnetBitcoinToken } from '$btc/derived/tokens.derived';
	import { resetUtxosDataStores } from '$btc/utils/btc-utxos.utils';
	import { btcAddressMainnet } from '$lib/derived/address.derived';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	onDestroy(() => {
		if (nonNullish($enabledMainnetBitcoinToken) && nonNullish($btcAddressMainnet)) {
			resetUtxosDataStores();
		}
	});
</script>

{#if nonNullish($enabledMainnetBitcoinToken) && nonNullish($btcAddressMainnet)}
	<BtcPendingSentTransactionsLoader
		networkId={$enabledMainnetBitcoinToken.network.id}
		source={$btcAddressMainnet}
	>
		<AllUtxosLoader networkId={$enabledMainnetBitcoinToken.network.id} source={$btcAddressMainnet}>
			<FeeRatePercentilesLoader networkId={$enabledMainnetBitcoinToken.network.id}>
				{@render children()}
			</FeeRatePercentilesLoader>
		</AllUtxosLoader>
	</BtcPendingSentTransactionsLoader>
{:else}
	{@render children()}
{/if}
