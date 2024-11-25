<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { selectUtxosFee as selectUtxosFeeApi } from '$btc/services/btc-send.services';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';

	export let amount: OptionAmount = undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let amountError = false;

	const { store } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	const loadEstimatedFee = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		const parsedAmount = nonNullish(amount) ? Number(amount) : undefined;

		// we need to make the value is not 0 because the utxos call fails if amount = 0
		if (amountError || isNullish(networkId) || isNullish(parsedAmount) || parsedAmount === 0) {
			store.reset();
			return;
		}

		// WizardModal re-renders content on step change (e.g. when switching between Convert to Review steps)
		// To avoid re-fetching the fees, we need to check if amount hasn't changed since the last request
		if (nonNullish($store) && $store.amountForFee === parsedAmount) {
			return;
		}

		const network = mapNetworkIdToBitcoinNetwork(networkId);

		const utxosFee = nonNullish(network)
			? await selectUtxosFeeApi({
					amount: parsedAmount,
					network,
					identity: $authIdentity
				})
			: undefined;

		if (isNullish(utxosFee)) {
			store.reset();
			return;
		}

		store.setUtxosFee({
			utxosFee,
			amountForFee: parsedAmount
		});
	};

	const debounceEstimateFee = debounce(loadEstimatedFee);

	$: amount, networkId, amountError, debounceEstimateFee();
</script>

<slot />
