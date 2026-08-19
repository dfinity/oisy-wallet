<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import LiquidiumProviderFee from '$lib/components/liquidium/supply/LiquidiumProviderFee.svelte';
	import LiquidiumSupplyAgreement from '$lib/components/liquidium/supply/LiquidiumSupplyAgreement.svelte';
	import StakeForm from '$lib/components/stake/StakeForm.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { LiquidiumMarket } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import { isDesktop } from '$lib/utils/device.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		market: LiquidiumMarket;
		amount: OptionAmount;
		// Network (gas/UTXO) fee, for the Max shortcut + disabled gate.
		totalFee?: bigint;
		// Provider fee (base units); shown as a row and reserved from Max.
		inflowFee?: bigint;
		// The provider-fee estimate failed (e.g. stale oracle price). Unlike repay, supply does not
		// guess a fee — it surfaces a retry message and stays disabled until prices refresh.
		inflowFeeUnavailable?: boolean;
		// Rail-specific balance check (gas/provider-fee coverage); owned by the wizard,
		// which holds the per-chain fee context.
		onCustomErrorValidate?: (userAmount: bigint) => Error | undefined;
		// Per-rail fee row (EthFeeDisplay / BtcUtxosFeeDisplay).
		feeDisplay: Snippet;
		// Opens the token-selection step; when set, the token logo becomes a selector.
		onSelectToken?: () => void;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		market,
		amount = $bindable(),
		totalFee,
		inflowFee,
		inflowFeeUnavailable = false,
		onCustomErrorValidate,
		feeDisplay,
		onSelectToken,
		onClose,
		onNext
	}: Props = $props();

	const { sendTokenDecimals } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let agreementChecked = $state(false);
	let amountError = $state<Error | undefined>();

	// Both fees must be resolved before the form can submit.
	let feeMissing = $derived(isNullish(totalFee) || isNullish(inflowFee));

	// TokenInput only re-validates on amount/token change, missing the async fee/
	// balance. Re-run synchronously so the error appears once they settle (mirrors
	// the stake form); clearing on an emptied amount stays with TokenInput.
	$effect(() => {
		if (invalidAmount(amount)) {
			return;
		}

		const next = onCustomErrorValidate?.(
			parseToken({ value: `${amount}`, unitName: $sendTokenDecimals })
		);

		if (next?.message !== amountError?.message) {
			amountError = next;
		}
	});
</script>

<StakeForm
	autofocus={isDesktop()}
	disabled={!agreementChecked || feeMissing || inflowFeeUnavailable}
	isSelectable={nonNullish(onSelectToken)}
	onClick={onSelectToken}
	{onClose}
	{onCustomErrorValidate}
	{onNext}
	providerFee={inflowFee}
	{totalFee}
	bind:amount
	bind:error={amountError}
>
	{#snippet content()}
		<MessageBox styleClass="sm:text-sm mb-6 !items-center">
			{$i18n.liquidium.text.supply_collateral_info}
		</MessageBox>

		<ModalValue>
			{#snippet label()}{$i18n.liquidium.text.supply_apy}{/snippet}
			{#snippet mainValue()}
				<span class="text-success-primary">{market.supplyApy.toFixed(2)}%</span>
			{/snippet}
		</ModalValue>

		<LiquidiumProviderFee {inflowFee} />

		{@render feeDisplay()}

		{#if inflowFeeUnavailable}
			<MessageBox level="warning" styleClass="mt-3">
				{$i18n.liquidium.text.supply_prices_unavailable}
			</MessageBox>
		{/if}

		<LiquidiumSupplyAgreement bind:checked={agreementChecked} />
	{/snippet}
</StakeForm>
