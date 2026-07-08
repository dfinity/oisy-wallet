<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import TokenInputContent from '$lib/components/tokens/TokenInputContent.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import type { TokenActionErrorType } from '$lib/types/token-action';

	interface Props {
		token?: Token;
		amount: OptionAmount;
		name?: string;
		displayUnit?: DisplayUnit;
		exchangeRate?: number;
		disabled?: boolean;
		readOnly?: boolean;
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
		readOnly = false,
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
</script>

<div
	class="rounded-lg border border-solid p-5 text-left duration-300"
	class:bg-brand-subtle-10={focused}
	class:bg-secondary={!focused}
	class:border-brand-subtle-20={focused}
	class:border-secondary={!focused}
>
	<TokenInputContent
		{name}
		{amountInfo}
		{autofocus}
		{balance}
		{disabled}
		{displayUnit}
		{exchangeRate}
		{isSelectable}
		{loading}
		{onClick}
		{onCustomErrorValidate}
		{onCustomValidate}
		{placeholder}
		{readOnly}
		{showTokenNetwork}
		{title}
		{token}
		bind:amount
		bind:errorType
		bind:error
		bind:amountSetToMax
		bind:focused
	/>
</div>

{#if nonNullish(error)}
	<p class="pb-2 text-error-primary" transition:slide={SLIDE_DURATION}>{error.message}</p>
{/if}
