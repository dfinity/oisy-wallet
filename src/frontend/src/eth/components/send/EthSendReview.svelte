<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { isEthAddress } from '$lib/utils/account.utils';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';

	export let destination = '';
	export let amount: OptionAmount = undefined;

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const { feeStore: storeFeeData }: FeeContext = getContext<FeeContext>(FEE_CONTEXT_KEY);

	let invalid = true;
	$: invalid =
		isNullishOrEmpty(destination) ||
		!isEthAddress(destination) ||
		invalidAmount(amount) ||
		isNullish($storeFeeData);
</script>

<SendReview on:icBack on:icSend {amount} {destination} disabled={invalid}>
	<EthFeeDisplay slot="fee">
		<Html slot="label" text={$i18n.fee.text.max_fee_eth} />
	</EthFeeDisplay>

	<ReviewNetwork slot="network" sourceNetwork={$sendToken.network} />
</SendReview>
