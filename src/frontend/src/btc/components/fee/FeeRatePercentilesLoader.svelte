<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { type Snippet, untrack } from 'svelte';
	import { getFeeRateFromPercentiles } from '$btc/services/btc-utxos.service';
	import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { NetworkId } from '$lib/types/network';
	import { mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';

	interface Props {
		networkId?: NetworkId;
		children: Snippet;
	}

	let { networkId, children }: Props = $props();

	const loadFeeRateFromPercentiles = async () => {
		if (isNullish(networkId)) {
			return;
		}

		const network = mapNetworkIdToBitcoinNetwork(networkId);

		if (isNullish(network) || isNullish($authIdentity)) {
			return;
		}

		const feeRateFromPercentiles = await getFeeRateFromPercentiles({
			identity: $authIdentity,
			network
		});

		feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles });
	};

	$effect(() => {
		[networkId];

		untrack(
			() =>
				isNullish($feeRatePercentilesStore?.feeRateFromPercentiles) && loadFeeRateFromPercentiles()
		);
	});
</script>

{@render children()}
