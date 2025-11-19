<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ReceiptData from '$lib/components/scanner/PayReceiptData.svelte';
	import { getContext } from 'svelte';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import PayHero from '$lib/components/scanner/PayHero.svelte';
	import { nonNullish } from '@dfinity/utils';

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

			<ReceiptData recipient={$data?.recipient} />
		{/if}
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<!-- TODO: Implement payment logic and enable Pay button -->
			<Button disabled={true} onclick={() => {}}>Pay</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
