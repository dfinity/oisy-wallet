<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import IconExpandMore from '$lib/components/icons/IconExpandMore.svelte';
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
	import { tryParseToken } from '$lib/utils/parse.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token?: Token;
		amount: OptionAmount;
		name?: string;
		displayUnit?: DisplayUnit;
		exchangeRate?: number;
		disabled?: boolean;
		// Styles the amount box as a muted, read-only readout (see
		// `TokenInputContainer`) while keeping the token selector interactive. For
		// derived amounts that can't be typed into; pair with `disabled`.
		muted?: boolean;
		placeholder?: string;
		errorType?: TokenActionErrorType;
		// TODO: We want to be able to reuse this component in the send forms. Unfortunately, the send forms work with errors instead of error types. For now, this component supports errors and error types but in the future the error handling in the send forms should be reworked.
		error?: Error;
		amountSetToMax?: boolean;
		loading?: boolean;
		isSelectable?: boolean;
		autofocus?: boolean;
		onCustomValidate?: (userAmount: bigint) => TokenActionErrorType;
		onCustomErrorValidate?: (userAmount: bigint) => Error | undefined;
		showTokenNetwork?: boolean;
		onClick?: () => void;
		title?: Snippet;
		amountInfo: Snippet;
		balance: Snippet;
	}

	let {
		token,
		amount = $bindable(),
		name = 'token-input',
		displayUnit = 'token',
		exchangeRate,
		disabled = false,
		muted = false,
		placeholder = '0',
		errorType = $bindable(),
		error = $bindable(),
		amountSetToMax = $bindable(false),
		loading = false,
		isSelectable = true,
		autofocus = false,
		onCustomValidate = () => undefined,
		onCustomErrorValidate = () => undefined,
		showTokenNetwork = false,
		onClick,
		title,
		amountInfo,
		balance
	}: Props = $props();

	let focused = $state(false);
	const onFocus = () => (focused = true);
	const onBlur = () => (focused = false);

	const onInput = () => {
		amountSetToMax = false;
	};

	const validate = () => {
		if (invalidAmount(amount) || isNullish(token)) {
			errorType = undefined;
			error = undefined;
			return;
		}

		// `tryParseToken` returns `undefined` for an out-of-range amount (e.g. a
		// user typing `1e400`) instead of throwing an unhandled error inside this
		// debounced callback. Treat it as an invalid amount so the input shows its
		// error state without running the custom validators on a missing value.
		const parsedValue = tryParseToken({
			value: `${amount}`,
			unitName: token.decimals
		});

		if (isNullish(parsedValue)) {
			errorType = 'invalid-amount';
			error = new Error($i18n.send.assertion.amount_invalid);
			return;
		}

		errorType = onCustomValidate(parsedValue);
		error = onCustomErrorValidate(parsedValue);
	};

	const debounceValidate = debounce(validate, 300);

	$effect(() => {
		[amount, token];

		debounceValidate();
	});
</script>

<div
	class="rounded-lg border border-solid p-5 text-left duration-300"
	class:bg-brand-subtle-10={focused}
	class:bg-secondary={!focused}
	class:border-brand-subtle-20={focused}
	class:border-secondary={!focused}
>
	<div class="space-between mb-2 flex justify-between text-sm font-bold">
		{@render title?.()}
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
		{muted}
		styleClass="h-14 text-3xl"
	>
		<!-- When muted, grey only the amount field (via `--input-background`) and
			 clip it to the container's rounded-left corner — the token selector to
			 the right keeps the active surface and stays interactive. -->
		<div
			style={muted ? '--input-background: var(--color-background-disabled-alt);' : undefined}
			class="flex h-full w-full items-center"
			class:overflow-hidden={muted}
			class:rounded-l-lg={muted}
		>
			{#if token}
				{#if displayUnit === 'token'}
					<TokenInputCurrencyToken
						{name}
						{autofocus}
						decimals={token.decimals}
						{disabled}
						error={nonNullish(errorType)}
						{loading}
						{onBlur}
						{onFocus}
						{onInput}
						{placeholder}
						bind:value={amount}
					/>
				{:else if displayUnit === 'usd'}
					<TokenInputCurrencyFiat
						{name}
						{autofocus}
						{disabled}
						error={nonNullish(errorType)}
						{exchangeRate}
						{loading}
						{onBlur}
						{onFocus}
						{onInput}
						{placeholder}
						tokenDecimals={token.decimals}
						bind:tokenAmount={amount}
					/>
				{/if}
			{:else}
				<button class="h-full w-full pl-3 text-base" onclick={onClick}
					>{$i18n.tokens.text.select_token}</button
				>
			{/if}
		</div>

		<div class="h-3/4 w-[1px] bg-disabled"></div>

		<button class="flex h-full gap-1 px-3" disabled={!isSelectable} onclick={onClick}>
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
		{@render amountInfo()}

		{@render balance()}
	</div>
</div>

{#if nonNullish(error)}
	<p class="pb-2 text-error-primary" transition:slide={SLIDE_DURATION}>{error.message}</p>
{/if}
