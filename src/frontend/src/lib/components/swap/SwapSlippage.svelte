<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IconSettings from '$lib/components/icons/lucide/IconSettings.svelte';
	import SwapSlippageEditor from '$lib/components/swap/SwapSlippageEditor.svelte';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapSlippageStatus } from '$lib/types/swap';
	import {
		formatSwapSlippageShort,
		getSwapSlippageInvalidValue,
		getSwapSlippageStatus,
		keepSwapSlippage
	} from '$lib/utils/swap.utils';

	interface Props {
		slippageValue: OptionAmount;
	}

	let { slippageValue = $bindable(undefined) }: Props = $props();

	const { sourceToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let maxSlippageInvalidValue = $derived(getSwapSlippageInvalidValue($sourceToken?.network.id));

	let parsedValue = $derived(nonNullish(slippageValue) ? Number(slippageValue) : 0);

	let status = $derived(getSwapSlippageStatus({ slippageValue, maxSlippageInvalidValue }));

	let visible = $state(false);

	// Saved when the editor closes, so typing "60" does not leave "6" behind on the way, and never on
	// mount, where nothing was chosen.
	let wasOpen = false;
	$effect(() => {
		if (wasOpen && !visible) {
			keepSwapSlippage(slippageValue);
		}

		wasOpen = visible;
	});

	// Background only: coloured text on these tints fails 4.5:1.
	const tints: Record<SwapSlippageStatus, string> = {
		valid: 'bg-brand-subtle-20 hover:bg-brand-subtle-30',
		warning: 'bg-warning-subtle-10 hover:bg-warning-subtle-30',
		invalid: 'bg-error-subtle-10 hover:bg-error-subtle-30'
	};

	let button = $state<HTMLButtonElement | undefined>();
</script>

<!-- Label is sr-only so the pill fits the 320 px header; the name still reads "Max slippage 1.5%". -->
<button
	bind:this={button}
	class={`hit-area relative me-3 flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold whitespace-nowrap text-primary hit-area-touch press ${tints[status]}`}
	aria-expanded={visible}
	aria-haspopup="dialog"
	onclick={() => (visible = true)}
	type="button"
>
	<span class="sr-only">{$i18n.swap.text.max_slippage} </span>
	<span>{formatSwapSlippageShort(parsedValue)}%</span>

	<IconSettings size="16" />
</button>

<!-- No 30 vh minimum: the sheet fits the editor. -->
<ResponsivePopover {button} sheetContentClass="" title={$i18n.swap.text.max_slippage} bind:visible>
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
