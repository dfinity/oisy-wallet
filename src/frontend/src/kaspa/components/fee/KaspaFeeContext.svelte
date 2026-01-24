<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, type Snippet, untrack } from 'svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { selectUtxosForSend } from '$kaspa/services/kaspa-send.services';
	import { KASPA_FEE_CONTEXT_KEY, type KaspaFeeContext } from '$kaspa/stores/kaspa-fee.store';
	import type { KaspaNetworkType } from '$kaspa/types/kaspa-send';
	import { isNetworkIdKASTestnet } from '$lib/utils/network.utils';
	import type { KaspaAddress } from '$kaspa/types/address';

	interface Props {
		observe: boolean;
		source: KaspaAddress;
		amount: OptionAmount;
		children: Snippet;
	}

	let { observe, source, amount, children }: Props = $props();

	const { feeStore, utxosFeeStore }: KaspaFeeContext =
		getContext<KaspaFeeContext>(KASPA_FEE_CONTEXT_KEY);

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let network = $derived<KaspaNetworkType>(
		isNetworkIdKASTestnet($sendTokenNetworkId) ? 'testnet' : 'mainnet'
	);

	const estimateFee = async () => {
		// In case we are already sending, we don't want to update the fee
		if (!observe) {
			return;
		}

		if (isNullishOrEmpty(source)) {
			feeStore.setFee(undefined);
			utxosFeeStore.setUtxosFee(undefined);
			return;
		}

		// Use a default amount for fee estimation if no amount provided
		const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
		const estimateAmount =
			nonNullish(numAmount) && numAmount > 0 ? BigInt(Math.floor(numAmount * 1e8)) : 100000n;

		try {
			const utxosFee = await selectUtxosForSend({
				address: source,
				amount: estimateAmount,
				network
			});

			utxosFeeStore.setUtxosFee(utxosFee);
			feeStore.setFee(utxosFee.fee);
		} catch (err) {
			console.error('Error estimating Kaspa fee:', err);
			feeStore.setFee(undefined);
			utxosFeeStore.setUtxosFee(undefined);
		}
	};

	const updateFee = async () => {
		clearTimer();

		await estimateFee();

		// Refresh fee estimate every 30 seconds (Kaspa has fast blocks)
		timer = setInterval(estimateFee, 30000);
	};

	$effect(() => {
		[source, amount, network];

		untrack(() => updateFee());
	});

	let timer = $state<NodeJS.Timeout | undefined>();

	const clearTimer = () => clearInterval(timer);

	onDestroy(clearTimer);
</script>

{@render children()}
