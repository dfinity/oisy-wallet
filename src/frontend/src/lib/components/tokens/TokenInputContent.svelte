<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconExpandMore from '$lib/components/icons/IconExpandMore.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import TokenInputContainer from '$lib/components/tokens/TokenInputContainer.svelte';
	import TokenInputCurrencyFiat from '$lib/components/tokens/TokenInputCurrencyFiat.svelte';
	import TokenInputCurrencyToken from '$lib/components/tokens/TokenInputCurrencyToken.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
	import { TOKEN_INPUT_SELECT_TOKEN_BUTTON } from '$lib/constants/test-ids.constants';
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
		readOnlyAmount?: boolean;
		// Opt-in companion to `disabled`: tints the amount half of the field so a
		// derived amount is legible as non-editable at a glance. Left off by default —
		// the other disabled legs in the app keep the plain fill. Has no effect on its
		// own, so it can never dress an editable field as dead.
		muted?: boolean;
		placeholder?: string;
		// Overrides the "Select token" prompt shown while no token is picked — e.g.
		// to name what has to be chosen first when the picker is still gated.
		selectTokenText?: string;
		errorType?: TokenActionErrorType;
		// TODO: We want to be able to reuse this component in the send forms. Unfortunately, the send forms work with errors instead of error types. For now, this component supports errors and error types but in the future the error handling in the send forms should be reworked.
		error?: Error;
		amountSetToMax?: boolean;
		loading?: boolean;
		isSelectable?: boolean;
		autofocus?: boolean;
		// Exposed so a host can react to the input focus (e.g. to style an outer card).
		focused?: boolean;
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
		readOnlyAmount = false,
		muted = false,
		placeholder = '0',
		selectTokenText,
		errorType = $bindable(),
		error = $bindable(),
		amountSetToMax = $bindable(false),
		loading = false,
		isSelectable = true,
		autofocus = false,
		focused = $bindable(false),
		onCustomValidate = () => undefined,
		onCustomErrorValidate = () => undefined,
		showTokenNetwork = false,
		onClick,
		title,
		amountInfo,
		balance
	}: Props = $props();

	// Nothing to type into and no picker to open: the field is inert, so it must
	// not offer a hover border or a pointer cursor.
	const inert = $derived(disabled && !isSelectable);

	// Gated on `disabled` so `muted` cannot produce a field that looks dead and still
	// takes a caret; `readOnlyAmount` is excluded because it drops the frame and
	// dresses the selector as its own pill, leaving nothing for the tint to fill.
	const mutedAmount = $derived(muted && disabled && !readOnlyAmount);

	// The selector joins the tint only while it cannot be opened. White is this
	// field's promise that a region is pressable, and it is kept honest both ways.
	const mutedSelector = $derived(mutedAmount && !isSelectable);

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
	{inert}
	muted={mutedAmount}
	{readOnlyAmount}
	styleClass="h-14 text-3xl"
>
	<!-- The gix input paints its own `--input-background`, cleared here so this
		 wrapper's fill shows through, and `rounded-l-lg` keeps that fill inside the
		 frame's corners. `cursor` is inherited, so not-allowed reaches the disabled
		 input without a rule of its own and stops at the selector, which carries its
		 own `cursor: pointer` for as long as it is enabled. -->
	<div
		style={readOnlyAmount || mutedAmount ? '--input-background: transparent;' : undefined}
		class="flex h-full w-full items-center"
		class:bg-disabled={mutedAmount}
		class:cursor-not-allowed={mutedAmount}
		class:rounded-l-lg={mutedAmount}
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
		{:else if readOnlyAmount}
			<div class="w-full pl-3 font-bold text-disabled">—</div>
		{:else}
			<!-- Muted and inert when the picker can't be opened yet (e.g. a pair's
				 second leg before the first is chosen), so the field doesn't invite a
				 click that does nothing. -->
			<button
				class="h-full w-full pl-3 text-base disabled:cursor-not-allowed"
				class:text-tertiary={!isSelectable}
				disabled={!isSelectable}
				onclick={onClick}
				type="button">{selectTokenText ?? $i18n.tokens.text.select_token}</button
			>
		{/if}
	</div>

	{#if !readOnlyAmount}
		<!-- Full height when muted: the inset rule leaves the container's white showing
			 above and below it, invisible on a white field but two slivers once the
			 halves either side are tinted. -->
		<div class={`w-[1px] bg-disabled ${mutedAmount ? 'h-full' : 'h-3/4'}`}></div>
	{/if}

	{#if !readOnlyAmount || isSelectable}
		<!-- `muted-selector` squares off the edge facing the divider. Every `button` is
			 rounded by the global stylesheet at `--border-radius-md` (16px, twice this
			 frame's), which goes unnoticed while the button has no fill of its own but
			 cuts two white notches out of the tint. A `rounded-*` utility cannot undo
			 it — utilities are emitted inside `@layer`, and the unlayered global rule
			 wins the cascade whatever its specificity — so the override is a scoped
			 rule, which is unlayered too. -->
		<button
			class="flex h-full items-center gap-1 px-3 transition-colors disabled:cursor-not-allowed"
			class:bg-disabled={mutedSelector}
			class:bg-primary={readOnlyAmount}
			class:border={readOnlyAmount}
			class:border-solid={readOnlyAmount}
			class:border-tertiary={readOnlyAmount}
			class:hover:border-brand-primary={readOnlyAmount && isSelectable}
			class:muted-selector={mutedSelector}
			class:rounded-lg={readOnlyAmount}
			class:shadow-inner={readOnlyAmount}
			data-tid={TOKEN_INPUT_SELECT_TOKEN_BUTTON}
			disabled={!isSelectable}
			onclick={onClick}
			type="button"
		>
			{#if token}
				<TokenLogo data={token} logoSize="xs" />
				<div class="ml-2 text-sm font-semibold">{getTokenDisplaySymbol(token)}</div>
			{:else}
				<!-- Grey rather than brand while the picker is unavailable: the plus is
					 the field's only affordance, so leaving it blue reads as actionable. The
					 disc is dropped on a muted field — the same tint over itself makes a
					 darker circle that draws the eye to the one control that does nothing. -->
				<span
					style={`width: ${logoSizes['xs']}; height: ${logoSizes['xs']};`}
					class="flex items-center justify-center rounded-full"
					class:bg-brand-primary={isSelectable}
					class:bg-disabled={!isSelectable && !mutedSelector}
					class:text-primary-inverted={isSelectable}
					class:text-tertiary={!isSelectable}
				>
					<IconPlus />
				</span>
			{/if}

			{#if isSelectable}
				<IconExpandMore />
			{/if}
		</button>
	{/if}
</TokenInputContainer>

<div class="mt-2 flex min-h-6 items-center justify-between text-sm">
	{@render amountInfo()}

	{@render balance()}
</div>

<style lang="scss">
	// Only the outer edge stays round; the edge against the divider is squared so the
	// muted fill meets the amount half without a notch of the frame showing through.
	.muted-selector {
		border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
	}
</style>
