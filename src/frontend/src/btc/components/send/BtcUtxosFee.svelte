<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, onMount } from 'svelte';
	import { prepareBtcSend } from '$btc/services/btc-utxos.service';
	import type { UtxosFee } from '$btc/types/btc-send';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';

	interface Props {
		utxosFee?: UtxosFee;
		amount?: OptionAmount;
		networkId?: NetworkId;
		source: string;
	}

	let {
		utxosFee = $bindable(undefined),
		amount = undefined,
		networkId = undefined,
		source
	}: Props = $props();

	const { sendTokenDecimals, sendTokenSymbol, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	const selectUtxosFee = async () => {
		try {
			// all required params should be already defined at this stage
			if (
				isNullish(amount) ||
				isNullish(networkId) ||
				isNullish($authIdentity)
			) {
				return;
			}

			const network = mapNetworkIdToBitcoinNetwork(networkId);
			utxosFee = nonNullish(network)
				? await prepareBtcSend({
					identity: $authIdentity,
					network,
					amount,
					source
				})
				: undefined;
		} catch (err: unknown) {
			console.error('Error selecting utxos fee', err);
			toastsError({
				msg: { text: $i18n.send.error.unexpected_utxos_fee },
				err
			});

			dispatch('icBack');
		}
	};

	onMount(async () => {
		if (isNullish(utxosFee)) {
			await selectUtxosFee();
		}
	});
</script>

<FeeDisplay
	feeAmount={utxosFee?.feeSatoshis}
	decimals={$sendTokenDecimals}
	symbol={$sendTokenSymbol}
	exchangeRate={$sendTokenExchangeRate}
>
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>
</FeeDisplay>
