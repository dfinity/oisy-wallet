<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import SendReviewDestination from '$lib/components/send/SendReviewDestination.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { STAKE_FORM_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Address } from '$lib/types/address';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { invalidAmount } from '$lib/utils/input.utils';

	interface Props {
		amount: OptionAmount;
		destination?: Address;
		totalFee?: bigint;
		onCustomValidate?: (userAmount: bigint) => TokenActionErrorType;
		onClose: () => void;
		onNext: () => void;
		fee?: Snippet;
		provider?: Snippet;
	}

	let {
		amount = $bindable(),
		destination,
		totalFee,
		onCustomValidate,
		onClose,
		onNext,
		fee,
		provider
	}: Props = $props();

	const { sendToken, sendTokenExchangeRate, sendBalance } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let errorType = $state<TokenActionErrorType | undefined>();
	let amountSetToMax = $state(false);
	let exchangeValueUnit = $state<DisplayUnit>('usd');
	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	let invalid = $derived(invalidAmount(amount) || Number(amount) === 0 || nonNullish(errorType));
</script>

<ContentWithToolbar>
	<div class="mb-8">
		<TokenInput
			displayUnit={inputUnit}
			exchangeRate={$sendTokenExchangeRate}
			isSelectable={false}
			{onCustomValidate}
			showTokenNetwork
			token={$sendToken}
			bind:amount
			bind:errorType
			bind:amountSetToMax
		>
			{#snippet title()}{$i18n.core.text.amount}{/snippet}

			{#snippet amountInfo()}
				<div class="text-tertiary">
					<TokenInputAmountExchange
						{amount}
						exchangeRate={$sendTokenExchangeRate}
						token={$sendToken}
						bind:displayUnit={exchangeValueUnit}
					/>
				</div>
			{/snippet}

			{#snippet balance()}
				<MaxBalanceButton
					balance={$sendBalance}
					error={nonNullish(errorType)}
					fee={totalFee}
					token={$sendToken}
					bind:amountSetToMax
					bind:amount
				/>
			{/snippet}
		</TokenInput>
	</div>

	{#if nonNullish(destination)}
		<div class="mb-8">
			<SendReviewDestination {destination} />
		</div>
	{/if}

	{@render fee?.()}

	{@render provider?.()}

	{#snippet toolbar()}
		<ButtonGroup testId="toolbar">
			<ButtonCancel onclick={onClose} />

			<Button disabled={invalid} onclick={onNext} testId={STAKE_FORM_REVIEW_BUTTON}>
				{$i18n.send.text.review}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
