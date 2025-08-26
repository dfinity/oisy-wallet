<script lang="ts">
	import { Collapsible, IconExpandMore, IconWarning } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import TokenInputContainer from '$lib/components/tokens/TokenInputContainer.svelte';
	import TokenInputCurrency from '$lib/components/tokens/TokenInputCurrency.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		SWAP_SLIPPAGE_INVALID_VALUE,
		SWAP_SLIPPAGE_PRESET_VALUES,
		SWAP_SLIPPAGE_VALUE_DECIMALS,
		SWAP_SLIPPAGE_WARNING_VALUE
	} from '$lib/constants/swap.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		slippageValue: OptionAmount;
		name?: string;
		maxSlippageInvalidValue: number;
	}

	let {
		slippageValue = $bindable(undefined),
		name = 'swap-slippage',
		maxSlippageInvalidValue
	}: Props = $props();

	let parsedValue = $derived(nonNullish(slippageValue) ? Number(slippageValue) : 0);

	let slippageValueWarning = $derived(
		parsedValue < maxSlippageInvalidValue && parsedValue >= SWAP_SLIPPAGE_WARNING_VALUE
	);

	let slippageValueError = $derived(parsedValue >= maxSlippageInvalidValue || parsedValue <= 0);

	let cmp = $state<Collapsible | undefined>(undefined);
	let expanded = $state(false);

	const extendedToggleContent = () => {
		expanded = !expanded;
		cmp?.toggleContent();
	};

	let focused = $state(false);
	const onFocus = () => (focused = true);
	const onBlur = () => (focused = false);

	const onPresetValueClick = (value: OptionAmount) => {
		slippageValue = value;

		extendedToggleContent();
	};
</script>

<div class="mb-2 mt-6 flex items-center">
	<span class="text-sm text-tertiary">{$i18n.swap.text.max_slippage}</span>

	<button
		class="ml-2 flex gap-1 rounded-md px-2 py-0.5 text-sm font-bold hover:bg-brand-subtle-30"
		class:bg-brand-subtle-20={!slippageValueError && !slippageValueWarning}
		class:bg-error-subtle-10={slippageValueError}
		class:bg-warning-subtle-10={slippageValueWarning}
		class:hover:bg-brand-subtle-30={!slippageValueError && !slippageValueWarning}
		class:hover:bg-error-subtle-30={slippageValueError}
		class:hover:bg-warning-subtle-30={slippageValueWarning}
		class:text-brand-primary={!slippageValueError && !slippageValueWarning}
		class:text-error-primary={slippageValueError}
		class:text-warning-primary={slippageValueWarning}
		aria-label={$i18n.swap.text.max_slippage}
		onclick={extendedToggleContent}
	>
		<span>{parsedValue}%</span>

		<span class="text-primary transition" class:rotate-180={expanded}>
			<IconExpandMore size="16" />
		</span>
	</button>
</div>

<div class="-m-2">
	<!-- todo: css hack, fix in gix component -->
	<Collapsible bind:this={cmp} expandButton={false} externalToggle={true}>
		{#snippet header()}{/snippet}
		<div class="p-2"
			><!-- offset above hack -->
			<div class="flex items-center">
				<TokenInputContainer error={slippageValueError} {focused} styleClass="h-12">
					<TokenInputCurrency
						{name}
						decimals={SWAP_SLIPPAGE_VALUE_DECIMALS}
						error={slippageValueError}
						bind:value={slippageValue}
						on:focus={onFocus}
						on:blur={onBlur}
					>
						{#snippet innerEnd()}
							<span class="text-tertiary">%</span>
						{/snippet}
					</TokenInputCurrency>
				</TokenInputContainer>

				{#each SWAP_SLIPPAGE_PRESET_VALUES as presetValue (presetValue)}
					<Button
						colorStyle="secondary-light"
						onclick={() => onPresetValueClick(presetValue)}
						paddingSmall={true}
						styleClass={`${nonNullish(slippageValue) && presetValue === Number(slippageValue) ? 'border border-brand-primary' : ''} min-w-16 ml-3 h-12 flex-initial`}
					>
						{presetValue}%
					</Button>
				{/each}
			</div>

			<div
				class="mt-2 text-sm text-tertiary"
				class:text-error-primary={slippageValueError}
				class:text-tertiary={!slippageValueError && !slippageValueWarning}
				class:text-warning-primary={slippageValueWarning}
			>
				{#if slippageValueError}
					<div in:fade
						>{replacePlaceholders($i18n.swap.text.max_slippage_error, {
							$maxSlippage: maxSlippageInvalidValue.toString()
						})}</div
					>
				{:else if slippageValueWarning}
					<div class="flex gap-1" in:fade>
						<IconWarning />
						<span>{$i18n.swap.text.max_slippage_warning}</span>
					</div>
				{:else}
					<div in:fade>
						{replacePlaceholders($i18n.swap.text.max_slippage_info, {
							$maxSlippage: maxSlippageInvalidValue.toString()
						})}</div
					>
				{/if}
			</div>
		</div>
	</Collapsible>
</div>
