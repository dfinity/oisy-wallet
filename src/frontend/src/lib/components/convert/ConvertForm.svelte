<script lang="ts">
	import { type Snippet, createEventDispatcher } from 'svelte';
	import ConvertAmount from '$lib/components/convert/ConvertAmount.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount: number | undefined;
		totalFee: bigint | undefined;
		destinationTokenFee?: bigint;
		minFee?: bigint;
		ethereumEstimateFee?: bigint;
		disabled: boolean;
		testId?: string;
		message?: Snippet;
		destination?: Snippet;
		fee?: Snippet;
		cancel?: Snippet;
	}

	let {
		sendAmount = $bindable(),
		receiveAmount = $bindable(),
		totalFee,
		destinationTokenFee = undefined,
		minFee = undefined,
		ethereumEstimateFee = undefined,
		disabled,
		testId = undefined,
		message,
		destination,
		fee,
		cancel
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let exchangeValueUnit: DisplayUnit = $state('usd');
</script>

<ContentWithToolbar {testId}>
	<ConvertAmount
		{destinationTokenFee}
		{ethereumEstimateFee}
		{minFee}
		{totalFee}
		bind:sendAmount
		bind:receiveAmount
		bind:exchangeValueUnit
	/>

	<div class="mt-6">
		{@render message?.()}

		{@render destination?.()}

		{@render fee?.()}
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			{@render cancel?.()}

			<Button {disabled} onclick={() => dispatch('icNext')} testId="convert-form-button-next">
				{$i18n.convert.text.review_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
