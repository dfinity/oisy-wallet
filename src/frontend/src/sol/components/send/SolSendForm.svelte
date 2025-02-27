<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import SolFeeDisplay from '$sol/components/fee/SolFeeDisplay.svelte';
	import SolSendAmount from '$sol/components/send/SolSendAmount.svelte';
	import SolSendDestination from '$sol/components/send/SolSendDestination.svelte';
	import type { SolAmountAssertionError } from '$sol/types/sol-send';
	import {SLIDE_DURATION} from "$lib/constants/transition.constants";
	import { slide } from 'svelte/transition';

	export let amount: OptionAmount = undefined;
	export let destination = '';
	export let source: string;

	const { sendToken, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let amountError: SolAmountAssertionError | undefined;
	let invalidDestination: boolean;

	let invalid = true;
	$: invalid =
		invalidDestination ||
		nonNullish(amountError) ||
		isNullishOrEmpty(destination) ||
		isNullish(amount);
</script>

<SendForm
	on:icNext
	{source}
	token={$sendToken}
	balance={$sendBalance}
	disabled={invalid}
	hideSource
>
	<div slot="amount">
		<SolSendAmount bind:amount bind:amountError />
		{#if nonNullish(amountError)}
			<p transition:slide={SLIDE_DURATION} class="pb-2 text-error-primary">{amountError.message}</p>
		{/if}
	</div>

	<SolSendDestination slot="destination" bind:destination bind:invalidDestination on:icQRCodeScan />

	<SolFeeDisplay slot="fee" />

	<slot name="cancel" slot="cancel" />
</SendForm>
