<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import InputCurrency from '$lib/components/ui/InputCurrency.svelte';
	import type { Token } from '$lib/types/token';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	export let token: Token;
	export let amount: number | undefined = undefined;
	export let disabled: boolean | undefined = undefined;
	export let customValidate: (userAmount: BigNumber | undefined) => void = () => {};
	export let error: Error | undefined = undefined;
	export let placeholder = '0.00';

	const onReset = () => {
		amount = undefined;
	};

	const validate = () => {
		const parsedValue = !invalidAmount(amount)
			? parseToken({
					value: `${amount}`,
					unitName: token.decimals
				})
			: undefined;

		customValidate(parsedValue);
	};

	const debounceValidate = debounce(validate, 300);

	$: amount, token.decimals, debounceValidate();
</script>

<div class="convert-input-amount text-3xl font-bold" class:error={nonNullish(error)}>
	<InputCurrency
		name="convert-amount"
		bind:value={amount}
		decimals={token.decimals}
		{placeholder}
		{disabled}
	>
		<svelte:fragment slot="inner-end">
			{#if nonNullish(amount) && !disabled}
				<button
					on:click|preventDefault={onReset}
					class={nonNullish(error) ? 'text-error' : 'text-aurometalsaurus'}
					class:hidden={isNullish(amount) || disabled}
				>
					<IconClose />
				</button>
			{/if}
		</svelte:fragment>
	</InputCurrency>
</div>

<style lang="postcss">
	:global(.convert-input-amount) {
		&.error {
			& > .input-block > div.input-field {
				& input[id],
				& input[id]:focus {
					border-color: var(--color-error-default);
					color: var(--color-error-default);
				}
			}
		}

		& > .input-block {
			--padding: 0;

			& > div.input-field input[id] {
				@apply h-14;

				&:disabled {
					--disable: var(--color-bright-gray);
					--input-background: var(--color-ghost-white);
				}
			}
		}
	}
</style>
