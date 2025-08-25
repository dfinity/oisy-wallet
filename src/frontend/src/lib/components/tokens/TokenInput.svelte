<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { slide } from 'svelte/transition';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import TokenInputContainer from '$lib/components/tokens/TokenInputContainer.svelte';
	import TokenInputCurrencyFiat from '$lib/components/tokens/TokenInputCurrencyFiat.svelte';
	import TokenInputCurrencyToken from '$lib/components/tokens/TokenInputCurrencyToken.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	export let token: Token | undefined = undefined;
	export let amount: OptionAmount;
	export let name = 'token-input';
	export let displayUnit: DisplayUnit = 'token';
	export let exchangeRate: number | undefined = undefined;
	export let disabled = false;
	export let placeholder = '0';
	export let errorType: TokenActionErrorType = undefined;
	// TODO: We want to be able to reuse this component in the send forms. Unfortunately, the send forms work with errors instead of error types. For now, this component supports errors and error types but in the future the error handling in the send forms should be reworked.
	export let error: Error | undefined = undefined;
	export let amountSetToMax = false;
	export let loading = false;
	export let isSelectable = true;
	export let autofocus = false;
	export let customValidate: (userAmount: bigint) => TokenActionErrorType = () => undefined;
	export let customErrorValidate: (userAmount: bigint) => Error | undefined = () => undefined;
	export let showTokenNetwork = false;

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
		error = customErrorValidate(parsedValue);
	};

	const debounceValidate = debounce(validate, 300);
	$: (amount, token, debounceValidate());
</script>

<div
	class="rounded-lg border border-solid p-5 text-left duration-300"
	class:bg-brand-subtle-10={focused}
	class:bg-secondary={!focused}
	class:border-brand-subtle-20={focused}
	class:border-secondary={!focused}
>
	<div class="space-between mb-2 flex justify-between text-sm font-bold">
		<slot name="title" />
		{#if showTokenNetwork && nonNullish(token)}
			<div class="flex text-xs font-normal text-tertiary">
				<span class="mr-1 text-sm">On {token.network.name}</span>
				<NetworkLogo network={token.network} />
			</div>
		{/if}
	</div>

	<TokenInputContainer
		error={nonNullish(errorType) || nonNullish(error)}
		{focused}
		styleClass="h-14 text-3xl"
	>
		<div class="flex h-full w-full items-center">
			{#if token}
				{#if displayUnit === 'token'}
					<TokenInputCurrencyToken
						{name}
						{autofocus}
						decimals={token.decimals}
						{disabled}
						error={nonNullish(errorType)}
						{loading}
						{placeholder}
						bind:value={amount}
						on:focus={onFocus}
						on:blur={onBlur}
						on:nnsInput={onInput}
					/>
				{:else if displayUnit === 'usd'}
					<TokenInputCurrencyFiat
						{name}
						{autofocus}
						{disabled}
						error={nonNullish(errorType)}
						{exchangeRate}
						{loading}
						{placeholder}
						tokenDecimals={token.decimals}
						bind:tokenAmount={amount}
						on:focus={onFocus}
						on:blur={onBlur}
						on:nnsInput={onInput}
					/>
				{/if}
			{:else}
				<button class="h-full w-full pl-3 text-base" on:click
					>{$i18n.tokens.text.select_token}</button
				>
			{/if}
		</div>

		<div class="h-3/4 w-[1px] bg-disabled"></div>

		<button class="flex h-full gap-1 px-3" disabled={!isSelectable} on:click>
			{#if token}
				<TokenLogo data={token} logoSize="xs" />
				<div class="ml-2 text-sm font-semibold">{getTokenDisplaySymbol(token)}</div>
			{:else}
				<span
					style={`width: ${logoSizes['xs']}; height: ${logoSizes['xs']};`}
					class="flex items-center justify-center rounded-full bg-brand-primary text-primary-inverted"
				>
					<IconPlus />
				</span>
			{/if}

			{#if isSelectable}
				<IconExpandMore />
			{/if}
		</button>
	</TokenInputContainer>

	<div class="mt-2 flex min-h-6 items-center justify-between text-sm">
		<slot name="amount-info" />

		<slot name="balance" />
	</div>
</div>

{#if nonNullish(error)}
	<p class="pb-2 text-error-primary" transition:slide={SLIDE_DURATION}>{error.message}</p>
{/if}
