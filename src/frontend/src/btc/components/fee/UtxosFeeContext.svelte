<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import type { BitcoinDid } from '@icp-sdk/canisters/ckbtc';
	import { getContext, onDestroy, onMount, type Snippet } from 'svelte';
	import {
		CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS,
		DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE
	} from '$btc/constants/btc.constants';
	import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
	import { getFeeRateFromPercentiles, prepareBtcSend } from '$btc/services/btc-utxos.service';
	import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import {
		BITCOIN_CANISTER_IDS,
		IC_CKBTC_MINTER_CANISTER_ID
	} from '$env/networks/networks.icrc.env';
	import { getUtxosQuery } from '$icp/api/bitcoin.api';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';

	interface Props {
		source: string;
		amount?: OptionAmount;
		networkId?: NetworkId;
		amountError?: boolean;
		children: Snippet;
	}

	let { source, amount, networkId, amountError = false, children }: Props = $props();

	const { store } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	let allUtxos = $derived<BitcoinDid.utxo[] | undefined>(undefined);
	let feeRateFromPercentiles = $derived<bigint | undefined>(undefined);

	const loadAllUtxos = async () => {
		const bitcoinCanisterId = BITCOIN_CANISTER_IDS[IC_CKBTC_MINTER_CANISTER_ID];

		const requiredMinConfirmations = CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS;

		if (isNullish(networkId)) {
			return;
		}

		const network = mapNetworkIdToBitcoinNetwork(networkId);

		if (isNullish(network)) {
			return;
		}

		const response = await getUtxosQuery({
			identity: $authIdentity,
			address: source,
			network,
			bitcoinCanisterId,
			minConfirmations: requiredMinConfirmations
		});

		allUtxos = response.utxos;
	};

	const loadFeeRateFromPercentiles = async () => {
		if (isNullish(networkId)) {
			return;
		}

		const network = mapNetworkIdToBitcoinNetwork(networkId);

		if (isNullish(network) || isNullish($authIdentity)) {
			return;
		}

		feeRateFromPercentiles = await getFeeRateFromPercentiles({
			identity: $authIdentity,
			network
		});
	};

	const loadEstimatedFee = () => {
		if (isNullish($authIdentity) || isNullish(allUtxos) || isNullish(feeRateFromPercentiles)) {
			return;
		}

		// If utxos are already known and the new amount is nullish or zero, we keep using the previous fee value
		if (nonNullish($store?.utxosFee) && (isNullish(amount) || Number(amount) === 0)) {
			return;
		}

		// UTXOs API call is a very time-consuming operation, even though the fees do not change often (no matter what amount is provided)
		// Therefore, to improve UX, we start fetching the fee directly on modal open event
		// Initially, we fetch fees with the default value and then re-fetch it in the background on value change
		const parsedAmount =
			nonNullish(amount) && Number(amount) !== 0
				? Number(amount)
				: DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE;

		// WizardModal re-renders content on step change (e.g. when switching between Convert to Review steps)
		// To avoid re-fetching the fees, we need to check if the amount hasn't changed since the last request
		if (
			amountError ||
			isNullish(networkId) ||
			isNullishOrEmpty(source) ||
			(nonNullish($store) && $store.amountForFee === parsedAmount)
		) {
			return;
		}

		// If the new amount is 10x bigger than previous value, we need to re-fetch the fees before allowing to proceed to the review step
		// TODO: remove it and re-fetch the fees on every amount update after time needed to complete the request is decreased
		if (nonNullish($store?.amountForFee) && Number($store.amountForFee) !== 0) {
			store.reset();
		}

		const network = mapNetworkIdToBitcoinNetwork(networkId);

		if (nonNullish(network)) {
			const utxosFee = prepareBtcSend({
				amount: parsedAmount,
				network,
				identity: $authIdentity,
				source,
				allUtxos,
				feeRateMiliSatoshisPerVByte: feeRateFromPercentiles
			});

			store.setUtxosFee({
				utxosFee,
				amountForFee: parsedAmount,
				allUtxos,
				feeRateFromPercentiles
			});
		} else {
			store.reset();
		}
	};

	onMount(() => {
		console.log({ $btcPendingSentTransactionsStore });
	});

	$effect(() => {
		if (isNullish(allUtxos)) {
			loadAllUtxos();
		}
	});

	$effect(() => {
		if (isNullish(feeRateFromPercentiles)) {
			loadFeeRateFromPercentiles();
		}
	});

	$effect(() => {
		if (isNullish($btcPendingSentTransactionsStore[source])) {
			loadBtcPendingSentTransactions({
				identity: $authIdentity,
				networkId,
				address: source
			});
		}
	});

	$effect(() => {
		[amount, networkId, source];

		if (
			nonNullish($btcPendingSentTransactionsStore[source]) &&
			nonNullish(allUtxos) &&
			nonNullish(feeRateFromPercentiles)
		) {
			loadEstimatedFee();
		}
	});
</script>

{@render children()}
