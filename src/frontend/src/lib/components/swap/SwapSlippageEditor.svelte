<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconGixWarning from '$lib/components/icons/IconGixWarning.svelte';
	import TokenInputContainer from '$lib/components/tokens/TokenInputContainer.svelte';
	import TokenInputCurrency from '$lib/components/tokens/TokenInputCurrency.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		SWAP_SLIPPAGE_PRESET_VALUES,
		SWAP_SLIPPAGE_VALUE_DECIMALS
	} from '$lib/constants/swap.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getSwapSlippageStatus } from '$lib/utils/swap.utils';
	import { fade } from '$lib/utils/transitions.utils';

	interface Props {
		slippageValue: OptionAmount;
		name?: string;
		maxSlippageInvalidValue: number;
		// Called after a preset is applied, so the host can close the editor.
		onPresetValueClick?: () => void;
	}

	let {
		slippageValue = $bindable(undefined),
		name = 'swap-slippage',
		maxSlippageInvalidValue,
		onPresetValueClick
	}: Props = $props();

	let status = $derived(getSwapSlippageStatus({ slippageValue, maxSlippageInvalidValue }));

	let slippageValueWarning = $derived(status === 'warning');

	let slippageValueError = $derived(status === 'invalid');

	let focused = $state(false);
	const onFocus = () => (focused = true);
	const onBlur = () => (focused = false);

	const selectPresetValue = (value: OptionAmount) => {
		slippageValue = value;

		onPresetValueClick?.();
	};
</script>

<div class="flex items-center">
	<TokenInputContainer error={slippageValueError} {focused} styleClass="h-12">
		<TokenInputCurrency
			{name}
			decimals={SWAP_SLIPPAGE_VALUE_DECIMALS}
			error={slippageValueError}
			{onBlur}
			{onFocus}
			onInput={() => {}}
			bind:value={slippageValue}
		>
			{#snippet innerEnd()}
				<span class="text-tertiary">%</span>
			{/snippet}
		</TokenInputCurrency>
	</TokenInputContainer>

	{#each SWAP_SLIPPAGE_PRESET_VALUES as presetValue (presetValue)}
		<Button
			colorStyle="secondary-light"
			onclick={() => selectPresetValue(presetValue)}
			paddingSmall={true}
			styleClass={`${nonNullish(slippageValue) && presetValue === Number(slippageValue) ? 'border border-brand-primary' : ''} min-w-14 ml-2 sm:min-w-16 sm:ml-3 h-12 flex-initial`}
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
			<IconGixWarning />
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
