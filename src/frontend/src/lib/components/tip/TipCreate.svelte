<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import StakeForm from '$lib/components/stake/StakeForm.svelte';
	import TipExpiry from '$lib/components/tip/TipExpiry.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { TIP_MESSAGE_MAX_CHARS } from '$lib/constants/tip.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { reservedTipAmounts } from '$lib/derived/tips.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { isDesktop } from '$lib/utils/device.utils';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { formatCurrency, formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { tipFees } from '$lib/utils/tip.utils';

	interface Props {
		token: IcToken;
		busy?: boolean;
		amount: OptionAmount;
		durationMs: number;
		message: string;
		onSelectToken: () => void;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		token,
		busy = false,
		amount = $bindable(),
		durationMs = $bindable(),
		message = $bindable(),
		onSelectToken,
		onClose,
		onNext
	}: Props = $props();

	// The real balance, from the same context `StakeForm` reads. The subtraction
	// happens here rather than in the store, so nothing outside this form sees a
	// reduced number.
	const { sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let fees = $derived(tipFees(token.fee));

	// What live tips in this token are already holding back, so the amount field's
	// ceiling can explain itself.
	let reserved = $derived($reservedTipAmounts[token.id] ?? ZERO);

	/**
	 * The ceiling for this form, and only this form.
	 *
	 * Deliberately not done by reducing the balance store: that made the send flow,
	 * the swap flow and every MAX control quietly offer less, misstated the
	 * portfolio total as though the money had left the account, and still could not
	 * be enforced — staking, depositing and any other wallet bypass it. So the
	 * subtraction lives where the decision is actually made, and everywhere else
	 * sees the real balance with the reservation shown as a status instead.
	 *
	 * `undefined` when nothing is reserved, so `StakeForm` keeps its own
	 * fee-aware maximum rather than being handed a cap it does not need.
	 */
	let maxAmount = $derived.by(() => {
		if (reserved === ZERO) {
			return undefined;
		}

		const balance = $sendBalance;

		if (isNullish(balance)) {
			return undefined;
		}

		const spendable = balance - reserved - fees.total;

		return spendable > ZERO ? spendable : ZERO;
	});

	// Counted in characters, matching the canister's own limit — a byte count
	// would reject a message the user sees as well within length.
	let messageLength = $derived([...message].length);
	let messageTooLong = $derived(messageLength > TIP_MESSAGE_MAX_CHARS);
	// Silent until the limit is in sight. A counter that is always on is noise on a
	// field most tips leave empty; one that appears only at the end is a surprise.
	let showMessageCount = $derived(messageLength > TIP_MESSAGE_MAX_CHARS - 40);

	const formatFee = (value: bigint) =>
		`${formatToken({ value, unitName: token.decimals, displayDecimals: token.decimals })} ${token.symbol}`;

	let exchangeRate = $derived($exchanges?.[token.id]?.usd);

	// The fee is the number a sender actually weighs, and they weigh it in their
	// own currency. Absent when no rate is known rather than shown as zero.
	let feeInFiat = $derived.by(() => {
		if (isNullish(exchangeRate)) {
			return undefined;
		}

		return formatCurrency({
			value: usdValue({ decimals: token.decimals, balance: fees.total, exchangeRate }),
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage,
			notBelowThreshold: true
		});
	});
</script>

<StakeForm
	autofocus={isDesktop()}
	disabled={messageTooLong || busy}
	isSelectable
	{maxAmount}
	nextLabel={$i18n.tip.text.generate}
	onClick={onSelectToken}
	{onClose}
	{onNext}
	bind:amount
	{...{ providerFee: fees.total }}
>
	{#snippet content()}
		<TipExpiry bind:durationMs />

		<div class="mb-4">
			<InputText
				name="tip-message"
				placeholder={$i18n.tip.text.message_placeholder}
				bind:value={message}
			/>

			{#if messageTooLong}
				<!-- The canister rejects anything longer, so the form blocks here rather
				     than letting Generate fail after an approve has already been paid for. -->
				<p class="mt-1 text-sm text-error-primary">
					{replacePlaceholders($i18n.tip.text.message_too_long, {
						$max: `${TIP_MESSAGE_MAX_CHARS}`
					})}
				</p>
			{:else if showMessageCount}
				<p class="mt-1 text-right text-sm text-tertiary">
					{messageLength}/{TIP_MESSAGE_MAX_CHARS}
				</p>
			{/if}
		</div>

		<ModalExpandableValues>
			{#snippet listHeader()}
				<ModalValue>
					{#snippet label()}{$i18n.tip.text.total_estimated_fee}{/snippet}
					{#snippet mainValue()}{formatFee(fees.total)}{/snippet}
					{#snippet secondaryValue()}
						{#if nonNullish(feeInFiat)}
							<span class="text-tertiary">{feeInFiat}</span>
						{/if}
					{/snippet}
				</ModalValue>
			{/snippet}

			{#snippet listItems()}
				<!-- Two rows, not one, because they are charged at different moments and
				     the sender should see that the second one is still theirs to pay. -->
				<ModalValue>
					{#snippet label()}{$i18n.tip.text.reserve_fee}{/snippet}
					{#snippet mainValue()}{formatFee(fees.reserve)}{/snippet}
				</ModalValue>

				<ModalValue>
					{#snippet label()}{$i18n.tip.text.payout_fee}{/snippet}
					{#snippet mainValue()}{formatFee(fees.payout)}{/snippet}
				</ModalValue>

				<!-- `m-0`: a bare `<p>` here would leave 18px hanging under the fee rows. -->
				<p class="m-0 mt-2 text-sm text-tertiary">{$i18n.tip.text.fees_are_yours}</p>
			{/snippet}
		</ModalExpandableValues>

		<!--
			An info panel rather than a line of small print. It is the answer to the
			question every sender asks before committing money to a link — what
			happens if nobody claims it — and the drawn design gives it this weight.
		-->
		{#if reserved > ZERO}
			<!--
				Without this, a sender whose tips already cover their balance sees a red
				"Max: 0" and no reason for it — a correct number that reads as a broken
				screen. Only shown when a reservation is actually holding something back.
			-->
			<MessageBox level="warning" styleClass="mt-4">
				{replacePlaceholders($i18n.tip.text.reserved_by_tips, {
					$amount: formatFee(reserved)
				})}
			</MessageBox>
		{/if}

		<MessageBox level="info" styleClass="mt-4">
			{$i18n.tip.text.lapse_notice}
		</MessageBox>
	{/snippet}
</StakeForm>
