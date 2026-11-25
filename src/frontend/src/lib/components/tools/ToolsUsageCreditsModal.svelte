<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import { getTokenFee } from '$icp/utils/token.utils';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		TOOLS_USAGE_CREDITS_ADD_BUTTON,
		TOOLS_USAGE_CREDITS_MODAL
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { addOwnCycles, type OwnCycles } from '$lib/services/own-cycles.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import { isDesktop } from '$lib/utils/device.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { tryParseToken } from '$lib/utils/parse.utils';

	interface Props {
		// The TCYCLES token, enabled or not: its symbol, decimals and ledger fee.
		token: IcToken;
		// The approval left and the TCYCLES balance, as the card read them.
		ownCycles: OwnCycles;
		// Called when the approval fails, so the card reads both again before the user retries:
		// the approval states the amount it replaces, which may have changed.
		onError: () => void;
	}

	let { token, ownCycles, onError }: Props = $props();

	let amount = $state<OptionAmount>();
	let amountSetToMax = $state(false);
	let adding = $state(false);

	let exchangeValueUnit = $state<DisplayUnit>('usd');
	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	let exchangeRate = $derived($exchanges?.[token.id]?.usd);

	// The approval costs one ledger fee, paid from the balance.
	let fee = $derived(getTokenFee(token) ?? ZERO);

	let parsedAmount = $derived(
		nonNullish(amount) && !invalidAmount(amount)
			? tryParseToken({ value: `${amount}`, unitName: token.decimals })
			: undefined
	);

	// The input's own check runs 300 ms after typing stops, so Add checks the balance itself.
	let invalid = $derived(
		isNullish(parsedAmount) || parsedAmount === ZERO || parsedAmount + fee > ownCycles.balance
	);

	const validateAmount = (userAmount: bigint): Error | undefined =>
		userAmount > ownCycles.balance
			? new Error($i18n.send.assertion.insufficient_funds)
			: userAmount + fee > ownCycles.balance
				? new Error($i18n.fee.assertion.insufficient_funds_for_fee)
				: undefined;

	let ownCreditsAfter = $derived(ownCycles.approved + (invalid ? ZERO : (parsedAmount ?? ZERO)));

	const close = () => modalStore.close();

	const add = async () => {
		if (isNullish(parsedAmount) || invalid) {
			return;
		}

		adding = true;

		try {
			await addOwnCycles({
				identity: $authIdentity,
				approved: ownCycles.approved,
				amount: parsedAmount
			});

			toastsShow({
				text: replacePlaceholders($i18n.usage_credits.text.added, {
					$amount: formatToken({
						value: parsedAmount,
						unitName: token.decimals,
						displayDecimals: token.decimals
					}),
					$token: token.symbol
				}),
				level: 'success',
				duration: 4000
			});

			close();
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.usage_credits.error.add }, err });

			onError();
		} finally {
			adding = false;
		}
	};
</script>

<Modal disablePointerEvents={adding} onClose={close} testId={TOOLS_USAGE_CREDITS_MODAL}>
	{#snippet title()}{$i18n.usage_credits.text.add_title}{/snippet}

	<ContentWithToolbar>
		<p class="mb-6 text-sm text-tertiary">
			{replacePlaceholders($i18n.usage_credits.text.add_description, { $token: token.symbol })}
		</p>

		<div class="mb-6">
			<TokenInput
				autofocus={isDesktop()}
				disabled={adding}
				displayUnit={inputUnit}
				{exchangeRate}
				isSelectable={false}
				onCustomErrorValidate={validateAmount}
				{token}
				bind:amount
				bind:amountSetToMax
			>
				{#snippet title()}{$i18n.core.text.amount}{/snippet}

				{#snippet amountInfo()}
					<div class="text-tertiary">
						<TokenInputAmountExchange
							{amount}
							{exchangeRate}
							{token}
							bind:displayUnit={exchangeValueUnit}
						/>
					</div>
				{/snippet}

				{#snippet balance()}
					<MaxBalanceButton
						balance={ownCycles.balance}
						{fee}
						{token}
						bind:amount
						bind:amountSetToMax
					/>
				{/snippet}
			</TokenInput>
		</div>

		<!-- With fiat values, as the send shows its amounts. -->
		<ConvertAmountDisplay
			amount={formatToken({
				value: ownCreditsAfter,
				unitName: token.decimals,
				displayDecimals: token.decimals
			})}
			{exchangeRate}
			symbol={token.symbol}
		>
			{#snippet label()}{$i18n.usage_credits.text.own_credits_after}{/snippet}
		</ConvertAmountDisplay>

		<FeeDisplay decimals={token.decimals} {exchangeRate} feeAmount={fee} symbol={token.symbol}>
			{#snippet label()}{$i18n.fee.text.approval_fee}{/snippet}
		</FeeDisplay>

		{#snippet toolbar()}
			<ButtonGroup>
				<ButtonCancel disabled={adding} onclick={close} />

				<Button
					disabled={invalid || adding}
					loading={adding}
					onclick={add}
					testId={TOOLS_USAGE_CREDITS_ADD_BUTTON}
				>
					{$i18n.core.text.add}
				</Button>
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</Modal>
