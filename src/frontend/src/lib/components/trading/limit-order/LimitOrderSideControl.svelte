<script lang="ts">
	import IconArrowDown from '$lib/components/icons/lucide/IconArrowDown.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LimitOrderSide } from '$lib/utils/oisy-trade.utils';

	interface Props {
		side: LimitOrderSide;
	}

	let { side = $bindable() }: Props = $props();
</script>

<div class="flex rounded-lg border border-disabled bg-secondary">
	<button
		class="flex flex-1 items-center justify-center gap-1.5 rounded-l-lg rounded-r-none py-3 text-sm font-semibold transition-colors"
		class:bg-error-subtle-20={side === 'sell'}
		class:text-error-primary={side === 'sell'}
		class:text-tertiary={side !== 'sell'}
		aria-pressed={side === 'sell'}
		onclick={() => (side = 'sell')}
		type="button"
	>
		<span class="rotate-180"><IconArrowDown size="16" /></span>
		{$i18n.trading.limit_order.sell}
	</button>
	<button
		class="flex flex-1 items-center justify-center gap-1.5 rounded-l-none rounded-r-lg py-3 text-sm font-semibold transition-colors"
		class:bg-success-subtle-20={side === 'buy'}
		class:text-success-primary={side === 'buy'}
		class:text-tertiary={side !== 'buy'}
		aria-pressed={side === 'buy'}
		onclick={() => (side = 'buy')}
		type="button"
	>
		<IconArrowDown size="16" />
		{$i18n.trading.limit_order.buy}
	</button>
</div>
