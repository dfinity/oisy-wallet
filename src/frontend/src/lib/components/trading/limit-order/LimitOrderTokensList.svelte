<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { oisyTradePairs } from '$lib/derived/oisy-trade.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import type { LimitOrderSide } from '$lib/utils/oisy-trade.utils';

	interface Props {
		mode: 'base' | 'quote';
		side: LimitOrderSide;
		baseSymbol?: string;
		onSelect: (symbol: string) => void;
		onCancel: () => void;
	}

	let { mode, side, baseSymbol, onSelect, onCancel }: Props = $props();

	const pairs = $derived($oisyTradePairs);

	// Base list: distinct base symbols, with how many quotes pair with each.
	// Quote list: distinct quote symbols that pair with the chosen base.
	const items = $derived.by((): { symbol: string; subtitle: string }[] => {
		if (mode === 'base') {
			const bases = [...new Set(pairs.map((p) => p.base.metadata.symbol))];
			return bases.map((symbol) => {
				const count = pairs.filter((p) => p.base.metadata.symbol === symbol).length;
				return {
					symbol,
					subtitle: `${count} ${count === 1 ? 'market' : 'markets'}`
				};
			});
		}
		const quotes = pairs
			.filter((p) => p.base.metadata.symbol === baseSymbol)
			.map((p) => p.quote.metadata.symbol);
		return [...new Set(quotes)].map((symbol) => ({ symbol, subtitle: '' }));
	});

	const title = $derived.by((): string => {
		const t = $i18n.trading.limit_order;
		if (mode === 'base') {
			return side === 'sell' ? t.select_base_token_sell : t.select_base_token_buy;
		}
		return t.select_quote_token;
	});

	const subtitle = $derived(
		mode === 'base'
			? $i18n.trading.limit_order.base_picker_subtitle
			: replacePlaceholders($i18n.trading.limit_order.quote_picker_subtitle, {
					$base: baseSymbol ?? ''
				})
	);
</script>

<ContentWithToolbar>
	<div class="flex flex-col gap-1">
		<p class="text-sm font-semibold text-primary">{title}</p>
		<p class="mb-2 text-xs text-tertiary">{subtitle}</p>
		{#each items as item (item.symbol)}
			<button
				class="flex items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-secondary"
				onclick={() => onSelect(item.symbol)}
				type="button"
			>
				<span class="text-sm font-semibold text-primary">{item.symbol}</span>
				{#if nonNullish(item.subtitle) && item.subtitle !== ''}
					<span class="text-xs text-tertiary">{item.subtitle}</span>
				{/if}
			</button>
		{/each}
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={onCancel} />
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
