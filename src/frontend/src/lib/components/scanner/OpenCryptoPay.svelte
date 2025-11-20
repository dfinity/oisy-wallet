<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import PayHero from '$lib/components/scanner/PayHero.svelte';
	import ReceiptData from '$lib/components/scanner/PayReceiptData.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';

	const { data } = getContext<PayContext>(PAY_CONTEXT_KEY);
</script>

<ContentWithToolbar>
	<div>
		{#if nonNullish($data)}
			<PayHero
				amount={$data.requestedAmount.amount}
				asset={$data.requestedAmount.asset}
				receipt={$data.displayName}
			/>

			{#if nonNullish($data.recipient)}
				<ReceiptData recipient={$data.recipient} />
			{/if}
		{/if}
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<!-- TODO: Implement payment logic and enable Pay button -->
			<Button disabled={true} onclick={() => {}}>Pay</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
