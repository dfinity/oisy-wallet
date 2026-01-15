<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { formatCurrency } from '$lib/utils/format.utils';

	interface Props {
		provider: Extract<SwapMappedResult, { provider: SwapProvider.VELORA }>;
	}

	const { provider }: Props = $props();
</script>

<ModalValue>
	{#snippet label()}
		{$i18n.swap.text.swap_route}
	{/snippet}

	{#snippet mainValue()}
		{provider.type === 'delta' ? 'Delta' : 'Market'}
	{/snippet}
</ModalValue>

{#if provider.type === 'delta'}
	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.network_cost}
		{/snippet}

		{#snippet mainValue()}
			{$i18n.swap.text.gasless}
		{/snippet}
	</ModalValue>

	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.swap_fees}
		{/snippet}

		{#snippet mainValue()}
			{formatCurrency({
				value: 0,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage
			})}
		{/snippet}
	</ModalValue>
{/if}
