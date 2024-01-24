<script lang="ts">
	import type { NetworkId } from '$lib/types/network';
	import { getContext } from 'svelte';
	import { BTC_FEE_CONTEXT_KEY, type BtcFeeContext } from '$icp/stores/btc-fee.store';
	import { debounce, isNullish } from '@dfinity/utils';
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import { token, tokenDecimals } from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';
	import { BTC_NETWORK_ID } from '$icp/constants/ckbtc.constants';
	import { parseToken } from '$lib/utils/parse.utils';
	import { authStore } from '$lib/stores/auth.store';
	import { queryEstimateFee } from '$icp/services/ckbtc.services';

	export let amount: string | number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;

	let ckBTC = false;
	$: ckBTC = isTokenCkBtcLedger($token as IcToken);

	const { store } = getContext<BtcFeeContext>(BTC_FEE_CONTEXT_KEY);

	const loadEstimatedFee = async () => {
		if (!ckBTC) {
			return;
		}

		if (networkId !== BTC_NETWORK_ID) {
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
			...($token as IcToken)
		});

		console.log(fee);

		if (isNullish(fee) || result === 'error') {
			store.setFee(null);
			return;
		}

		store.setFee(fee);
	};

	const debounceEstimateFee = debounce(loadEstimatedFee);

	$: amount, networkId, (() => debounceEstimateFee())();
</script>

<slot />
