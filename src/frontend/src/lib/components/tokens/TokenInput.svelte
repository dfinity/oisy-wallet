<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { createEventDispatcher } from 'svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import TokenInputContainer from '$lib/components/tokens/TokenInputContainer.svelte';
	import TokenInputCurrencyToken from '$lib/components/tokens/TokenInputCurrencyToken.svelte';
	import TokenInputCurrencyUsd from '$lib/components/tokens/TokenInputCurrencyUsd.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ConvertAmountErrorType } from '$lib/types/convert';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	export let token: Token | undefined = undefined;
	export let amount: OptionAmount;
	export let name = 'token-input';
	export let displayUnit: DisplayUnit = 'token';
	export let exchangeRate: number | undefined = undefined;
	export let disabled = false;
	export let placeholder = '0';
	export let errorType: ConvertAmountErrorType = undefined;
	export let amountSetToMax = false;
	export let loading = false;
	export let isSelectable = true;
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
	class="rounded-lg p-5 first:mb-2 border border-solid text-left transition"
	class:bg-brand-subtle-30={focused}
	class:border-brand-subtle-alt={focused}
	class:bg-secondary={!focused}
	class:border-secondary={!focused}
>
	<div class="mb-2 text-sm font-bold"><slot name="title" /></div>

	<TokenInputContainer {focused} styleClass="h-14 text-3xl" error={nonNullish(errorType)}>
		<div class="flex h-full w-full items-center">
			{#if token}
				{#if displayUnit === 'token'}
					<TokenInputCurrencyToken
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
				{:else if displayUnit === 'usd'}
					<TokenInputCurrencyUsd
						bind:tokenAmount={amount}
						tokenDecimals={token.decimals}
						{exchangeRate}
						{name}
						{placeholder}
						{disabled}
						{loading}
						error={nonNullish(errorType)}
						on:focus={onFocus}
						on:blur={onBlur}
						on:nnsInput={onInput}
					/>
				{/if}
			{:else}
				<button on:click class="pl-3 text-base h-full w-full"
					>{$i18n.tokens.text.select_token}</button
				>
			{/if}
		</div>

		<div class="h-3/4 w-[1px] bg-disabled" />

		<button class="gap-1 px-3 flex h-full" on:click disabled={!isSelectable}>
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

			{#if isSelectable}
				<IconExpandMore />
			{/if}
		</button>
	</TokenInputContainer>

	<div class="mt-2 min-h-6 text-sm flex items-center justify-between">
		<slot name="amount-info" />

		<slot name="balance" />
	</div>
</div>
