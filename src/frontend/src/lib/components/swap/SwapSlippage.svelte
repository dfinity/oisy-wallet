<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconSettings from '$lib/components/icons/lucide/IconSettings.svelte';
	import SwapSlippageEditor from '$lib/components/swap/SwapSlippageEditor.svelte';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { saveSwapSlippage } from '$lib/utils/swap-slippage-storage.utils';
	import { formatSwapSlippageShort, getSwapSlippageStatus } from '$lib/utils/swap.utils';

	interface Props {
		slippageValue: OptionAmount;
		maxSlippageInvalidValue: number;
	}

	let { slippageValue = $bindable(undefined), maxSlippageInvalidValue }: Props = $props();

	let parsedValue = $derived(nonNullish(slippageValue) ? Number(slippageValue) : 0);

	let status = $derived(getSwapSlippageStatus({ slippageValue, maxSlippageInvalidValue }));

	let visible = $state(false);

	// Saved once the editor closes, so typing "60" does not leave "6" behind on the way. Only a value
	// Review accepts is kept for the next swap: an empty or out-of-range one would open it blocked.
	$effect(() => {
		if (!visible && status !== 'invalid') {
			saveSwapSlippage(slippageValue);
		}
	});

	// The tint is the background only: brand, warning and error text on their own tints stay under
	// 4.5:1 in one theme or the other, so the value keeps the primary text colour.
	let tint = $derived(
		status === 'invalid'
			? 'bg-error-subtle-10'
			: status === 'warning'
				? 'bg-warning-subtle-10'
				: 'bg-brand-subtle-20'
	);

	let hoverTint = $derived(
		status === 'invalid'
			? 'hover:bg-error-subtle-30'
			: status === 'warning'
				? 'hover:bg-warning-subtle-30'
				: 'hover:bg-brand-subtle-30'
	);

	let button = $state<HTMLButtonElement | undefined>();
</script>

<!-- Sits in the modal header, left of the close button, as the value and a settings icon only:
     the aria-label names it, and the tint alone marks a risky or refused value, so that the pill
     fits its header column at 320 px and the title stays centred. -->
<button
	bind:this={button}
	class={`hit-area relative me-3 flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold whitespace-nowrap text-primary transition-colors duration-150 ease-out press ${tint} ${hoverTint}`}
	aria-expanded={visible}
	aria-haspopup="dialog"
	aria-label={$i18n.swap.text.max_slippage}
	onclick={() => (visible = true)}
	type="button"
>
	<span>{formatSwapSlippageShort(parsedValue)}%</span>

	<IconSettings size="16" />
</button>

<!-- The editor fills the sheet, so it drops the sheet's minimum height and the space it leaves. -->
<ResponsivePopover
	ariaLabel={$i18n.swap.text.max_slippage}
	{button}
	sheetContentClass=""
	title={$i18n.swap.text.max_slippage}
	bind:visible
>
	{#snippet content()}
		<div class="w-full md:w-90">
			<SwapSlippageEditor
				{maxSlippageInvalidValue}
				onPresetValueClick={() => (visible = false)}
				bind:slippageValue
			/>
		</div>
	{/snippet}
</ResponsivePopover>
