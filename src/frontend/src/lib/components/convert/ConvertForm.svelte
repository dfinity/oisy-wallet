<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ConvertAmount from '$lib/components/convert/ConvertAmount.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let totalFee: bigint | undefined;
	export let disabled: boolean;
	export let insufficientFunds: boolean;
	export let insufficientFundsForFee: boolean;

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar>
	<ConvertAmount
		bind:sendAmount
		bind:receiveAmount
		bind:insufficientFunds
		bind:insufficientFundsForFee
		{totalFee}
	/>

	<div class="mt-16 pb-5">
		<slot name="message" />

		<slot name="fee" />
	</div>

	<ButtonGroup slot="toolbar">
		<slot name="cancel" />

		<Button {disabled} on:click={() => dispatch('icNext')}>
			{$i18n.convert.text.review_button}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
