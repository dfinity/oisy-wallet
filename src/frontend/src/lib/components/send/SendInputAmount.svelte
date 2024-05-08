<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { debounce, nonNullish } from '@dfinity/utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { slide } from 'svelte/transition';
	import { i18n } from '$lib/stores/i18n.store';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { invalidAmount } from '$lib/utils/input.utils';

	export let amount: number | undefined = undefined;
	export let tokenDecimals: number | undefined = undefined;
	export let label: string = $i18n.core.text.amount;
	export let placeholder: string = $i18n.core.text.amount;
	export let customValidations: ((value: BigNumber) => Error | undefined)[] = [];
	export let reactivityVariables: (unknown | undefined)[] = [];
	export let debounceTime: number | undefined = 300;

	let error: Error | undefined;

	const runValidations = (value: BigNumber) => {
		let validationError;
		for (let validate of customValidations) {
			validationError = validate(value);
			if (validationError) {
				return validationError;
			}
		}
		return validationError;
	};

	const validate = () => {
		if (invalidAmount(amount)) {
			return;
		}

		const parsedValue = parseToken({
			value: `${amount}`,
			unitName: tokenDecimals
		});

		error = runValidations(parsedValue);
	};

	const debounceValidate = debounce(validate, debounceTime);

	$: amount, tokenDecimals, reactivityVariables, debounceValidate();
</script>

<label for="amount" class="font-bold px-4.5">{label}</label>
<Input
	name="amount"
	inputType="currency"
	required
	bind:value={amount}
	decimals={tokenDecimals}
	{placeholder}
	spellcheck={false}
/>

{#if nonNullish(error)}
	<p transition:slide={{ duration: 250 }} class="text-cyclamen pb-3">{error.message}</p>
{/if}
