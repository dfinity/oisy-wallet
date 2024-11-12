<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import { debounce, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { fade } from 'svelte/transition';
	import InputCurrency from '$lib/components/ui/InputCurrency.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ConvertAmountErrorType } from '$lib/types/convert';
	import type { Token } from '$lib/types/token';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	export let token: Token;
	export let amount: number | undefined = undefined;
	export let name = 'convert-amount';
	export let disabled: boolean | undefined = undefined;
	export let customValidate: (userAmount: BigNumber) => ConvertAmountErrorType = () => undefined;
	export let errorType: ConvertAmountErrorType = undefined;
	export let placeholder = '0';

	const onReset = () => {
		amount = undefined;
	};

	const validate = () => {
		if (invalidAmount(amount)) {
			errorType = undefined;
			return;
		}

		const parsedValue = parseToken({
			value: `${amount}`,
			unitName: token.decimals
		});

		errorType = customValidate(parsedValue);
	};

	const debounceValidate = debounce(validate, 300);

	let errorState: boolean;
	$: errorState = nonNullish(errorType) && errorType === 'insufficient-funds';

	$: amount, token.decimals, debounceValidate();
</script>

<div class="convert-input-amount text-3xl font-bold" class:error={errorState}>
	<InputCurrency
		{name}
		testId="convert-amount"
		bind:value={amount}
		decimals={token.decimals}
		{placeholder}
		{disabled}
	>
		<svelte:fragment slot="inner-end">
			{#if nonNullish(amount) && !disabled}
				<button
					transition:fade={{ duration: 200 }}
					data-tid="convert-amount-reset"
					aria-label={$i18n.convert.text.input_reset_button}
					on:click|preventDefault={onReset}
					class={errorState ? 'text-error' : 'text-aurometalsaurus'}
				>
					<IconClose />
				</button>
			{/if}
		</svelte:fragment>
	</InputCurrency>
</div>

<style lang="postcss">
	:global(.convert-input-amount div.input-block) {
		--padding: 0;
	}

	:global(.convert-input-amount.error div.input-field input[id]) {
		border-color: var(--color-error-default);
		color: var(--color-error-default);
	}

	:global(.convert-input-amount div.input-field input[id]) {
		@apply h-14;

		&:disabled {
			--disable: var(--color-bright-gray);
			--input-background: var(--color-ghost-white);
		}
	}
</style>
