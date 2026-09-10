<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import EthFeePriority from '$eth/components/fee/EthFeePriority.svelte';
	import EthSendAmount from '$eth/components/send/EthSendAmount.svelte';
	import { isEthAddress } from '$eth/utils/account.utils';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { SEND_INSUFFICIENT_FEE_INFO } from '$lib/constants/test-ids.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		amount: OptionAmount;
		amountSetToMax?: boolean;
		destination?: string;
		nativeEthereumToken: Token;
		selectedContact?: ContactUi;
		onBack: () => void;
		onNext: () => void;
		onTokensList: () => void;
		cancel: Snippet;
	}

	let {
		amount = $bindable(),
		amountSetToMax = $bindable(false),
		destination = $bindable(''),
		nativeEthereumToken,
		selectedContact,
		onBack,
		onNext,
		onTokensList,
		cancel
	}: Props = $props();

	// Starts blocked rather than permissive: a freshly (re-)mounted amount step - e.g. right after
	// "Back" from Review, which remounts this form - must not read as valid before its own
	// validation has actually run once on the current amount.
	let insufficientFunds = $state(true);
	let insufficientFundsForFee = $state(false);

	let invalidDestination = $derived(isNullishOrEmpty(destination) || !isEthAddress(destination));

	let invalid = $derived(invalidDestination || insufficientFunds || isNullish(amount));
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
		<EthSendAmount
			{nativeEthereumToken}
			{onTokensList}
			bind:amount
			bind:amountSetToMax
			bind:insufficientFunds
			bind:insufficientFundsForFee
		/>
	{/snippet}

	{#snippet priority()}
		<EthFeePriority />
	{/snippet}

	{#snippet fee()}
		<EthFeeDisplay estimated>
			{#snippet label()}
				<Html text={$i18n.fee.text.estimated_fee_eth} />
			{/snippet}
		</EthFeeDisplay>
	{/snippet}

	{#snippet info()}
		{#if insufficientFundsForFee}
			<MessageBox level="warning" styleClass="mt-6 sm:text-sm" testId={SEND_INSUFFICIENT_FEE_INFO}>
				{replacePlaceholders($i18n.send.assertion.not_enough_tokens_for_gas, {
					$symbol: nativeEthereumToken.symbol,
					$balance: formatToken({
						value: $balancesStore?.[nativeEthereumToken.id]?.data ?? ZERO,
						unitName: nativeEthereumToken.decimals,
						displayDecimals: nativeEthereumToken.decimals
					})
				})}
			</MessageBox>
		{/if}
	{/snippet}
</SendForm>
