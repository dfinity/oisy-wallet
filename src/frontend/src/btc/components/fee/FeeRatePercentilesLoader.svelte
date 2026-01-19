<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext, type Snippet, untrack } from 'svelte';
	import { getFeeRateFromPercentiles } from '$btc/services/btc-utxos.service';
	import {
		FEE_RATE_PERCENTILES_CONTEXT_KEY,
		type FeeRatePercentilesContext
	} from '$btc/stores/fee-rate-percentiles.store';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { NetworkId } from '$lib/types/network';
	import { mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';

	interface Props {
		networkId?: NetworkId;
		children: Snippet;
	}

	let { networkId, children }: Props = $props();

	const { store } = getContext<FeeRatePercentilesContext>(FEE_RATE_PERCENTILES_CONTEXT_KEY);

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

		store.setFeeRateFromPercentiles({ feeRateFromPercentiles });
	};

	$effect(() => {
		[networkId];

		untrack(() => loadFeeRateFromPercentiles());
	});
</script>

{@render children()}
