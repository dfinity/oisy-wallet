<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
	import IcSendAmount from '$icp/components/send/IcSendAmount.svelte';
	import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
	import type { IcAmountAssertionError } from '$icp/types/ic-send';
	import { invalidIcpAddress } from '$icp/utils/account.utils';
	import { isInvalidDestinationIc, isInvalidNat64Memo } from '$icp/utils/ic-send.utils';
	import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		amount: OptionAmount;
		destination?: string;
		selectedContact?: ContactUi;
		onBack: () => void;
		onNext: () => void;
		onTokensList: () => void;
		cancel: Snippet;
	}

	let {
		amount = $bindable(),
		destination = $bindable(''),
		selectedContact,
		onBack,
		onNext,
		onTokensList,
		cancel
	}: Props = $props();

	const { sendTokenStandard, sendMemo } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let memo = $state($sendMemo);

	$effect(() => {
		sendMemo.set(memo);
	});

	let amountError = $state<IcAmountAssertionError | undefined>();

	let invalidDestination = $derived(
		isNullishOrEmpty(destination) ||
			isInvalidDestinationIc({
				destination,
				tokenStandard: $sendTokenStandard
			})
	);

	// Classic ICP addresses use the nat64 memo (numeric). ICRC-style addresses accept any text.
	let isClassicIcpAddress = $derived(
		!isNullishOrEmpty(destination) &&
			invalidIcrcAddress(destination) &&
			!invalidIcpAddress(destination)
	);

	let memoError = $derived(
		isClassicIcpAddress && memo.trim() !== '' && isInvalidNat64Memo(memo)
			? $i18n.send.assertion.memo_invalid_nat64
			: undefined
	);

	let invalid = $derived(
		invalidDestination || nonNullish(amountError) || isNullish(amount) || nonNullish(memoError)
	);
</script>

<SendForm
	{cancel}
	{destination}
	disabled={invalid}
	{invalidDestination}
	{onBack}
	{onNext}
	{selectedContact}
>
	{#snippet sendAmount()}
		<IcSendAmount {onTokensList} bind:amount bind:amountError />
	{/snippet}

	{#snippet fee()}
		{#if !$isIcMintingAccount}
			<IcTokenFee />
		{/if}
	{/snippet}

	{#snippet info()}
		<div class="mb-4">
			<label class="mb-1 block text-sm text-tertiary" for="memo">{$i18n.send.text.memo}</label>
			<InputText
				name="memo"
				placeholder={isClassicIcpAddress
					? $i18n.send.placeholder.enter_memo_nat64
					: $i18n.send.placeholder.enter_memo}
				required={false}
				bind:value={memo}
			/>
			{#if nonNullish(memoError)}
				<p class="mt-2 mb-0 text-sm text-error-primary" transition:slide={SLIDE_DURATION}>
					{memoError}
				</p>
			{/if}
		</div>
	{/snippet}
</SendForm>
