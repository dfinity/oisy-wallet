<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ConvertAmount from '$lib/components/convert/ConvertAmount.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let totalFee: bigint | undefined;
	export let minFee: bigint | undefined = undefined;
	export let ethereumEstimateFee: bigint | undefined = undefined;
	export let disabled: boolean;
	export let insufficientFunds: boolean;
	export let insufficientFundsForFee: boolean;
	export let amountLessThanLedgerFee: boolean | undefined = undefined;
	export let minimumAmountNotReached: boolean | undefined = undefined;
	export let unknownMinimumAmount: boolean | undefined = undefined;
	export let minterInfoNotCertified: boolean | undefined = undefined;

	const dispatch = createEventDispatcher();

	let exchangeValueUnit: DisplayUnit = 'usd';
</script>

<ContentWithToolbar>
	<ConvertAmount
		bind:sendAmount
		bind:receiveAmount
		bind:insufficientFunds
		bind:insufficientFundsForFee
		bind:amountLessThanLedgerFee
		bind:minimumAmountNotReached
		bind:unknownMinimumAmount
		bind:minterInfoNotCertified
		bind:exchangeValueUnit
		{totalFee}
		{minFee}
		{ethereumEstimateFee}
	/>

	<div class="mt-6">
		<slot name="message" />

		<slot name="fee" />
	</div>

	<ButtonGroup slot="toolbar">
		<slot name="cancel" />

		<Button {disabled} on:click={() => dispatch('icNext')} testId="convert-form-button-next">
			{$i18n.convert.text.review_button}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
