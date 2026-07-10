<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
	import OisyTradeMark from '$lib/components/trading/OisyTradeMark.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { OISY_TRADE_PROVIDER_NAME } from '$lib/constants/oisy-trade.constants';
	import { TRADING_WITHDRAW_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		amount: OptionAmount;
		transferFee: bigint;
		onBack: () => void;
		onConfirm: () => void;
	}

	let { amount, transferFee, onBack, onConfirm }: Props = $props();

	const { sendToken, sendTokenExchangeRate } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let grossBaseUnits = $derived(
		nonNullish(amount) ? parseToken({ value: `${amount}`, unitName: $sendToken.decimals }) : ZERO
	);

	let receiveBaseUnits = $derived(
		grossBaseUnits > transferFee ? grossBaseUnits - transferFee : ZERO
	);
</script>

<ContentWithToolbar>
	<SendTokenReview exchangeRate={$sendTokenExchangeRate} sendAmount={amount} token={$sendToken}>
		{#snippet subtitle()}{$i18n.trading.withdraw.amount_label}{/snippet}
	</SendTokenReview>

	<ModalValue>
		{#snippet label()}{$i18n.trading.withdraw.network}{/snippet}
		{#snippet mainValue()}
			<span class="inline-flex items-center gap-2">
				{$sendToken.network.name}
				<NetworkLogo network={$sendToken.network} />
			</span>
		{/snippet}
	</ModalValue>

	<ModalValue>
		{#snippet label()}{$i18n.trading.withdraw.from}{/snippet}
		{#snippet mainValue()}
			<span class="inline-flex items-center gap-2">
				<OisyTradeMark size="22" />
				{OISY_TRADE_PROVIDER_NAME}
			</span>
		{/snippet}
	</ModalValue>

	<FeeDisplay
		decimals={$sendToken.decimals}
		displayExchangeRate={false}
		feeAmount={transferFee}
		symbol={$sendToken.symbol}
	>
		{#snippet label()}{$i18n.trading.withdraw.transfer_fee}{/snippet}
	</FeeDisplay>

	<FeeDisplay
		decimals={$sendToken.decimals}
		displayExchangeRate={!$isPrivacyMode}
		exchangeRate={$sendTokenExchangeRate}
		feeAmount={receiveBaseUnits}
		symbol={$sendToken.symbol}
	>
		{#snippet label()}{$i18n.trading.withdraw.you_receive}{/snippet}
	</FeeDisplay>

	{#snippet toolbar()}
		<ButtonGroup testId="toolbar">
			<ButtonBack onclick={onBack} />

			<Button onclick={onConfirm} testId={TRADING_WITHDRAW_REVIEW_BUTTON}>
				{$i18n.trading.withdraw.submit}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
