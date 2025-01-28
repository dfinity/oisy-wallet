<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { createEventDispatcher } from 'svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import SwapInputContainer from '$lib/components/swap/SwapInputContainer.svelte';
	import SwapInputCurrency from '$lib/components/swap/SwapInputCurrency.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ConvertAmountErrorType } from '$lib/types/convert';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	export let token: Token | undefined = undefined;
	export let amount: OptionAmount;
	export let name = 'swap-amount';
	export let disabled = false;
	export let placeholder = '0';
	export let errorType: ConvertAmountErrorType = undefined;
	export let amountSetToMax = false;
	export let loading = false;
	export let customValidate: (userAmount: BigNumber) => ConvertAmountErrorType = () => undefined;

	const dispatch = createEventDispatcher();

	let focused: boolean;
	const onFocus = () => (focused = true);
	const onBlur = () => (focused = false);

	const onInput = () => {
		amountSetToMax = false;
		dispatch('nnsInput');
	};

	const validate = () => {
		if (invalidAmount(amount) || isNullish(token)) {
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
	$: amount, token, debounceValidate();
</script>

<div
	class="rounded-lg border border-solid p-5 text-left transition first:mb-2"
	class:bg-brand-subtle-alt={focused}
	class:border-brand-subtle-alt={focused}
	class:bg-secondary={!focused}
	class:border-secondary={!focused}
>
	<div class="mb-2 text-sm font-bold"><slot name="title" /></div>

	<SwapInputContainer {focused} styleClass="h-14 text-3xl" error={nonNullish(errorType)}>
		<div class="flex h-full w-full items-center">
			{#if token}
				<SwapInputCurrency
					bind:value={amount}
					{name}
					{placeholder}
					{disabled}
					{loading}
					decimals={token.decimals}
					error={nonNullish(errorType)}
					on:focus={onFocus}
					on:blur={onBlur}
					on:nnsInput={onInput}
				/>
			{:else}
				<button on:click class="h-full w-full pl-3 text-base">{$i18n.swap.text.select_token}</button
				>
			{/if}
		</div>

		<div class="h-3/4 w-[1px] bg-disabled" />

		<button class="flex h-full gap-1 px-3" on:click>
			{#if token}
				<TokenLogo data={token} logoSize="xs" />
				<div class="ml-2 text-sm font-semibold">{token.symbol}</div>
			{:else}
				<span
					class="flex items-center justify-center rounded-full bg-brand-primary text-white"
					style={`width: ${logoSizes['xs']}; height: ${logoSizes['xs']};`}
				>
					<IconPlus />
				</span>
			{/if}

			<IconExpandMore />
		</button>
	</SwapInputContainer>

	<div class="mt-2 flex min-h-6 items-center justify-between text-sm">
		<slot name="amount-info" />

		<slot name="balance" />
	</div>
</div>
