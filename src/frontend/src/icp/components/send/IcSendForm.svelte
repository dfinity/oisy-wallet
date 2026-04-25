<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
	import IcpMemoInfo from '$icp/components/send/IcpMemoInfo.svelte';
	import IcSendAmount from '$icp/components/send/IcSendAmount.svelte';
	import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
	import type { IcAmountAssertionError } from '$icp/types/ic-send';
	import { invalidIcpAddress } from '$icp/utils/account.utils';
	import { isInvalidDestinationIc, isInvalidNat64Memo } from '$icp/utils/ic-send.utils';
	import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
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

	let isIcpToken = $derived($sendTokenStandard.code === 'icp');

	let showIcpMemoInfo = $derived(
		isIcpToken && nonNullish($sendMemo) && $sendMemo !== ''
	);

	let amountError = $state<IcAmountAssertionError | undefined>();

	let invalidDestination = $derived(
		isNullishOrEmpty(destination) ||
			isInvalidDestinationIc({
				destination,
				tokenStandard: $sendTokenStandard
			})
	);

	let isIcrcDestination = $derived(!invalidIcrcAddress(destination));
	let isIcpDestination = $derived(!invalidIcpAddress(destination));

	let invalidMemo = $derived(
		isIcpDestination && nonNullish($sendMemo) && $sendMemo !== '' && isInvalidNat64Memo($sendMemo)
	);

	let invalid = $derived(
		invalidDestination || nonNullish(amountError) || isNullish(amount) || invalidMemo
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

	{#snippet memo()}
		{#if isIcrcDestination || isIcpDestination}
			<div class="-mt-6 mb-4">
				<div class="flex items-center gap-3">
					<label class="shrink-0 text-sm text-tertiary" for="memo">{$i18n.send.text.memo}</label>
					<div class="flex-1">
						<InputText
							name="memo"
							placeholder={isIcpDestination
								? $i18n.send.placeholder.enter_memo_nat64
								: $i18n.send.placeholder.enter_memo}
							required={false}
							bind:value={$sendMemo}
						/>
					</div>
				</div>
				{#if invalidMemo}
					<p class="mt-1 text-sm text-error-primary">{$i18n.send.assertion.invalid_nat64_memo}</p>
				{/if}
			</div>
		{/if}
	{/snippet}

	{#snippet fee()}
		{#if !$isIcMintingAccount}
			<IcTokenFee />
		{/if}
	{/snippet}

	{#snippet info()}
		{#if showIcpMemoInfo}
			<IcpMemoInfo />
		{/if}
	{/snippet}
</SendForm>
