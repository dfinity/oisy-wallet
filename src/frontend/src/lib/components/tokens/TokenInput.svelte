<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { slide } from 'svelte/transition';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import TokenInputContainer from '$lib/components/tokens/TokenInputContainer.svelte';
	import TokenInputCurrencyToken from '$lib/components/tokens/TokenInputCurrencyToken.svelte';
	import TokenInputCurrencyUsd from '$lib/components/tokens/TokenInputCurrencyUsd.svelte';
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
	import NetworkLogo from '../networks/NetworkLogo.svelte';
	import TokenInputWrapper from '$lib/components/tokens/TokenInputWrapper.svelte';
	import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
	import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
	import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';

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
	export let showErrorMessage: boolean = true;
	export let customErrorValidate: (userAmount: bigint) => Error | undefined = () => undefined;
	export let tokenNetwork: any = undefined;
	export let supportCrossChain: boolean = false;

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
	$: amount, token, debounceValidate();
</script>

<div
	class="rounded-xl p-5 text-left duration-300"
	class:bg-secondary={!focused}
	class:border-secondary={!focused && !supportCrossChain}
	class:bg-brand-subtle-10={focused}
	class:border-brand-subtle-20={focused && !supportCrossChain}
	class:border={!supportCrossChain}
>
	<div class="space-between mb-2 flex justify-between text-sm font-bold">
		<slot name="title" />
		{#if nonNullish(tokenNetwork)}
			<div class="flex text-xs font-normal text-tertiary">
				<span class="mr-1 text-sm">On {tokenNetwork.name}</span>
				<NetworkLogo network={tokenNetwork} />
			</div>
		{/if}
	</div>

	<TokenInputContainer
		{focused}
		styleClass="h-14 text-3xl"
		error={nonNullish(errorType) || nonNullish(error)}
	>
		<div class="flex h-full w-full items-center">
			{#if token}
				{#if displayUnit === 'token'}
					<TokenInputCurrencyToken
						bind:value={amount}
						{name}
						{placeholder}
						{disabled}
						{loading}
						{autofocus}
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
						{autofocus}
						error={nonNullish(errorType)}
						on:focus={onFocus}
						on:blur={onBlur}
						on:nnsInput={onInput}
					/>
				{/if}
			{:else}
				<button on:click class="h-full w-full pl-3 text-base"
					>{$i18n.tokens.text.select_token}</button
				>
			{/if}
		</div>

		<div class="h-3/4 w-[1px] bg-disabled"></div>

		<button class="flex h-full gap-1 px-3" on:click disabled={!isSelectable}>
			{#if token}
				<TokenLogo data={token} logoSize="xs" />
				<div class="ml-2 text-sm font-semibold">{getTokenDisplaySymbol(token)}</div>
			{:else}
				<span
					class="flex items-center justify-center rounded-full bg-brand-primary text-primary-inverted"
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

	<div class="mt-2 flex min-h-6 items-center justify-between text-sm">
		<slot name="amount-info" />

		<slot name="balance" />
	</div>
</div>

{#if nonNullish(error) && showErrorMessage}
	<p transition:slide={SLIDE_DURATION} class="pb-2 text-error-primary">{error.message}</p>
{/if}
