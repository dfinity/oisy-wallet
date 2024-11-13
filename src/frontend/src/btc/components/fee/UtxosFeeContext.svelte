<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { selectUtxosFee as selectUtxosFeeApi } from '$btc/services/btc-send.services';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import type { NetworkId } from '$lib/types/network';
	import { isNetworkIdBitcoin, mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';

	export let amount: number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;

	const { store } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	const loadEstimatedFee = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (
			isNullish(networkId) ||
			!isNetworkIdBitcoin(networkId) ||
			isNullish(amount) ||
			amount === 0
		) {
			store.setUtxosFee(null);
			return;
		}

		const network = mapNetworkIdToBitcoinNetwork(networkId);

		const utxosFee = nonNullish(network)
			? await selectUtxosFeeApi({
					amount,
					network,
					identity: $authIdentity
				})
			: undefined;

		if (isNullish(utxosFee)) {
			store.setUtxosFee(null);
			return;
		}

		store.setUtxosFee({
			utxosFee
		});
	};

	const debounceEstimateFee = debounce(loadEstimatedFee);

	$: amount, networkId, (() => debounceEstimateFee())();
</script>

<slot />
