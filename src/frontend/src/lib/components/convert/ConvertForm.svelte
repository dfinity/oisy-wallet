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
	export let destinationTokenFee: bigint | undefined = undefined;
	export let minFee: bigint | undefined = undefined;
	export let ethereumEstimateFee: bigint | undefined = undefined;
	export let disabled: boolean;
	export let testId: string | undefined = undefined;

	const dispatch = createEventDispatcher();

	let exchangeValueUnit: DisplayUnit = 'usd';
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
		<slot name="message" />

		<slot name="destination" />

		<slot name="fee" />
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<slot name="cancel" />

			<Button {disabled} onclick={() => dispatch('icNext')} testId="convert-form-button-next">
				{$i18n.convert.text.review_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
