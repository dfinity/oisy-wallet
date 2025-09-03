<script lang="ts">
	import { isNullish, nonNullish, debounce } from '@dfinity/utils';
	import { createEventDispatcher, getContext, onMount, onDestroy } from 'svelte';
	import { BTC_UTXOS_FEE_UPDATE_INTERVAL } from '$btc/constants/btc.constants';
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

	let schedulerTimer: NodeJS.Timeout | undefined;
	let isActive = true;

	const updatePrepareBtcSend = async () => {
		try {
			// all required params should be already defined at this stage
			if (isNullish(amount) || isNullish(networkId) || isNullish($authIdentity)) {
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
			toastsError({
				msg: { text: $i18n.send.error.unexpected_utxos_fee },
				err
			});

			dispatch('icBack');
		}
	};

	const debouncedPrepareBtcSend = debounce(updatePrepareBtcSend);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const startScheduler = () => {
		// Stop existing scheduler if it exists
		stopScheduler();
		isActive = true;

		// Start the recurring scheduler
		const scheduleNext = () => {
			schedulerTimer = setTimeout(() => {
				// only execute next update if still active
				if (isActive) {
					debouncedPrepareBtcSend();
					scheduleNext();
				}
			}, BTC_UTXOS_FEE_UPDATE_INTERVAL);
		};

		scheduleNext();
	};

	const stopScheduler = () => {
		isActive = false;

		if (schedulerTimer) {
			// Clear existing timer
			clearTimeout(schedulerTimer);
			schedulerTimer = undefined;
		}
	};

	onMount(() => {
		if (isNullish(utxosFee)) {
			debouncedPrepareBtcSend();
		}

		// TODO remove this line and uncomment the line below to enable the scheduler once the to many pending transactions all isssue is fixed
		// Start the scheduler after initial load
		// startScheduler();
		// startScheduler();
	});

	onDestroy(() => {
		stopScheduler();
	});
</script>

<FeeDisplay
	decimals={$sendTokenDecimals}
	exchangeRate={$sendTokenExchangeRate}
	feeAmount={utxosFee?.feeSatoshis}
	symbol={$sendTokenSymbol}
>
	{#snippet label()}{$i18n.fee.text.fee}{/snippet}
</FeeDisplay>
