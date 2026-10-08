<script lang="ts">
	import type { Snippet } from 'svelte';
	import ConvertAmount from '$lib/components/convert/ConvertAmount.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount?: number;
		totalFee?: bigint;
		destinationTokenFee?: bigint;
		minFee?: bigint;
		ethereumEstimateFee?: bigint;
		/**
		 * Hard cap (base units) for "Max", for a source token whose spendable amount is lower
		 * than its balance — BTC, where the balance also counts UTXOs a send cannot select yet.
		 * Left unset, "Max" is the balance minus the fee as before.
		 */
		maxAmount?: bigint;
		disabled: boolean;
		testId?: string;
		onNext: () => void;
		message: Snippet;
		destination?: Snippet;
		fee: Snippet;
		cancel: Snippet;
		warningBanner?: Snippet;
	}

	let {
		sendAmount = $bindable(),
		receiveAmount = $bindable(),
		totalFee,
		destinationTokenFee,
		minFee,
		ethereumEstimateFee,
		maxAmount,
		disabled,
		testId,
		onNext,
		message,
		destination,
		fee,
		cancel,
		warningBanner
	}: Props = $props();

	let exchangeValueUnit = $state<DisplayUnit>('usd');
</script>

<ContentWithToolbar {testId}>
	{@render warningBanner?.()}

	<ConvertAmount
		{destinationTokenFee}
		{ethereumEstimateFee}
		{maxAmount}
		{minFee}
		{totalFee}
		bind:sendAmount
		bind:receiveAmount
		bind:exchangeValueUnit
	/>

	<div class="mt-6">
		{@render message()}

		{@render destination?.()}

		{@render fee()}
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			{@render cancel()}

			<Button {disabled} onclick={onNext} testId="convert-form-button-next">
				{$i18n.convert.text.review_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
