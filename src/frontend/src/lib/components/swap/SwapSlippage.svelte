<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconSettings from '$lib/components/icons/lucide/IconSettings.svelte';
	import SwapSlippageEditor from '$lib/components/swap/SwapSlippageEditor.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { formatSwapSlippageShort, getSwapSlippageStatus } from '$lib/utils/swap.utils';

	interface Props {
		slippageValue: OptionAmount;
		maxSlippageInvalidValue: number;
		// On Review the quote being confirmed was fetched with this slippage, so the pill only shows
		// it: changing it means going back to the form.
		readonly?: boolean;
	}

	let {
		slippageValue = $bindable(undefined),
		maxSlippageInvalidValue,
		readonly = false
	}: Props = $props();

	let parsedValue = $derived(nonNullish(slippageValue) ? Number(slippageValue) : 0);

	let status = $derived(getSwapSlippageStatus({ slippageValue, maxSlippageInvalidValue }));

	let tint = $derived(
		status === 'invalid'
			? 'bg-error-subtle-10 text-error-primary'
			: status === 'warning'
				? 'bg-warning-subtle-10 text-warning-primary'
				: 'bg-brand-subtle-20 text-brand-primary'
	);

	let hoverTint = $derived(
		status === 'invalid'
			? 'hover:bg-error-subtle-30'
			: status === 'warning'
				? 'hover:bg-warning-subtle-30'
				: 'hover:bg-brand-subtle-30'
	);

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();
</script>

<!-- Sits in the modal header, left of the close button, as the value and a settings icon only:
     the aria-label names it, and the tint alone marks a risky or refused value, so that the pill
     fits its header column at 320 px and the title stays centred. -->
{#if readonly}
	<!-- From 640 px up only (Responsive's `md`, the CSS `sm` that hides the Review row): beside the
	     longer Review title it would cut it on phones, where Review lists the slippage in its details.
	     Not rendered rather than hidden, so the close button keeps its full tap area there. -->
	<Responsive up="md">
		<span
			class={`me-3 flex items-center rounded-md px-2 py-0.5 text-sm font-bold whitespace-nowrap ${tint}`}
		>
			<span class="sr-only">{$i18n.swap.text.max_slippage} </span>
			{formatSwapSlippageShort(parsedValue)}%
		</span>
	</Responsive>
{:else}
	<button
		bind:this={button}
		class={`hit-area relative me-3 flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold whitespace-nowrap transition-colors duration-150 ease-out press ${tint} ${hoverTint}`}
		aria-expanded={visible}
		aria-haspopup="dialog"
		aria-label={$i18n.swap.text.max_slippage}
		onclick={() => (visible = true)}
		type="button"
	>
		<span>{formatSwapSlippageShort(parsedValue)}%</span>

		<IconSettings size="16" />
	</button>

	<ResponsivePopover ariaLabel={$i18n.swap.text.max_slippage} {button} bind:visible>
		{#snippet content()}
			<div class="w-full md:w-90">
				<p class="mb-3 text-sm font-bold">{$i18n.swap.text.max_slippage}</p>

				<SwapSlippageEditor
					{maxSlippageInvalidValue}
					onPresetValueClick={() => (visible = false)}
					bind:slippageValue
				/>
			</div>
		{/snippet}
	</ResponsivePopover>
{/if}
