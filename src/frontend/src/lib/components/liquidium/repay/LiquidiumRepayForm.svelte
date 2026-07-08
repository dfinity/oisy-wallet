<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import LiquidiumHealthFactor from '$lib/components/liquidium/LiquidiumHealthFactor.svelte';
	import LiquidiumRepayDebtRows from '$lib/components/liquidium/repay/LiquidiumRepayDebtRows.svelte';
	import LiquidiumProviderFee from '$lib/components/liquidium/supply/LiquidiumProviderFee.svelte';
	import StakeForm from '$lib/components/stake/StakeForm.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import type { LiquidiumRepayPreview } from '$lib/services/liquidium-repay.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import { isDesktop } from '$lib/utils/device.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		reserve: LiquidiumReserve;
		preview: LiquidiumRepayPreview;
		amount: OptionAmount;
		// Full outstanding debt (base units) — caps the "Max" shortcut.
		maxRepay?: bigint;
		// Network (gas/UTXO) fee, for the Max shortcut + disabled gate.
		totalFee?: bigint;
		// Provider fee (base units); shown as a row and reserved from Max.
		inflowFee?: bigint;
		// The provider-fee estimate failed (e.g. stale oracle price). Account-based repay has no
		// SDK-sanctioned fee fallback, so it surfaces a retry message and stays disabled (like Supply).
		inflowFeeUnavailable?: boolean;
		// Rail-specific balance check (gas/provider-fee coverage); owned by the wizard.
		onCustomErrorValidate?: (userAmount: bigint) => Error | undefined;
		// Per-rail fee row (EthFeeDisplay / BtcUtxosFeeDisplay).
		feeDisplay: Snippet;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		reserve,
		preview,
		amount = $bindable(),
		maxRepay,
		totalFee,
		inflowFee,
		inflowFeeUnavailable = false,
		onCustomErrorValidate,
		feeDisplay,
		onClose,
		onNext
	}: Props = $props();

	const { sendTokenDecimals } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let amountError = $state<Error | undefined>();

	// Both fees must be resolved before the form can submit.
	let feeMissing = $derived(isNullish(totalFee) || isNullish(inflowFee));

	// Repaying more than the outstanding debt is rejected before the rail-specific affordability
	// check, so the user sees the relevant cap (mirrors Borrow's "exceeds power" / Withdraw's
	// "exceeds free collateral"). "Max (full debt)" sets exactly `maxRepay`, so it never self-flags.
	const validateAmount = (userAmount: bigint): Error | undefined => {
		if (nonNullish(maxRepay) && userAmount > maxRepay) {
			return new Error($i18n.liquidium.text.repay_exceeds_debt);
		}

		return onCustomErrorValidate?.(userAmount);
	};

	// TokenInput only re-validates on amount/token change, missing the async fee/balance. Re-run
	// synchronously so the error appears once they settle (mirrors the supply form); clearing on
	// an emptied amount stays with TokenInput.
	$effect(() => {
		if (invalidAmount(amount)) {
			return;
		}

		const next = validateAmount(parseToken({ value: `${amount}`, unitName: $sendTokenDecimals }));

		if (next?.message !== amountError?.message) {
			amountError = next;
		}
	});
</script>

<StakeForm
	autofocus={isDesktop()}
	disabled={feeMissing || inflowFeeUnavailable}
	maxAmount={maxRepay}
	{onClose}
	onCustomErrorValidate={validateAmount}
	{onNext}
	providerFee={inflowFee}
	{totalFee}
	bind:amount
	bind:error={amountError}
>
	{#snippet content()}
		<LiquidiumRepayDebtRows {amount} {reserve} />

		<LiquidiumProviderFee {inflowFee} />

		{@render feeDisplay()}

		{#if inflowFeeUnavailable}
			<MessageBox level="warning" styleClass="mt-3">
				{$i18n.liquidium.text.repay_prices_unavailable}
			</MessageBox>
		{/if}

		<LiquidiumHealthFactor percent={preview.projectedHealthPercent} />
	{/snippet}
</StakeForm>
