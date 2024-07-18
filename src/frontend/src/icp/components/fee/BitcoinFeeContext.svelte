<script lang="ts">
	import type { NetworkId } from '$lib/types/network';
	import { getContext } from 'svelte';
	import { BITCOIN_FEE_CONTEXT_KEY, type BitcoinFeeContext } from '$icp/stores/bitcoin-fee.store';
	import { debounce, isNullish } from '@dfinity/utils';
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import { tokenDecimals } from '$lib/derived/token.derived';
	import { parseToken } from '$lib/utils/parse.utils';
	import { authStore } from '$lib/stores/auth.store';
	import { queryEstimateFee } from '$icp/services/ckbtc.services';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';
	import { tokenWithFallbackAsIcToken } from '$icp/derived/ic-token.derived';

	export let amount: string | number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;

	let ckBTC = false;
	$: ckBTC = isTokenCkBtcLedger($tokenWithFallbackAsIcToken);

	const { store } = getContext<BitcoinFeeContext>(BITCOIN_FEE_CONTEXT_KEY);

	const loadEstimatedFee = async () => {
		if (!ckBTC) {
			return;
		}

		if (!isNetworkIdBitcoin(networkId)) {
			store.setFee(null);
			return;
		}

		if (isNullish(amount) || amount === '') {
			store.setFee(null);
			return;
		}

		const { fee, result } = await queryEstimateFee({
			identity: $authStore.identity,
			amount: parseToken({
				value: `${amount}`,
				unitName: $tokenDecimals
			}).toBigInt(),
			...$tokenWithFallbackAsIcToken
		});

		if (isNullish(fee) || result === 'error') {
			store.setFee(null);
			return;
		}

		store.setFee({
			bitcoinFee: fee
		});
	};

	const debounceEstimateFee = debounce(loadEstimatedFee);

	$: amount, networkId, (() => debounceEstimateFee())();
</script>

<slot />
