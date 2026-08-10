<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import SendDataSpender from '$lib/components/send/SendDataSpender.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import {
		SOLANA_HIGH_PRIORITIZATION_FEE_BALANCE_DIVISOR,
		SOLANA_HIGH_PRIORITIZATION_FEE_IN_LAMPORTS,
		SOLANA_TRANSACTION_FEE_IN_LAMPORTS
	} from '$sol/constants/sol.constants';

	interface Props {
		amount?: bigint;
		destination: string;
		source: string;
		application: string;
		data?: string;
		token: Token;
		// Native token of the network the request targets. Fees are always paid in SOL, even
		// when the transaction itself moves an SPL token.
		feeToken: Token;
		prioritizationFee?: bigint;
		isApproval?: boolean;
		unreviewed?: boolean;
		onApprove: () => void;
		onReject: () => void;
	}

	let {
		amount,
		destination,
		source,
		application,
		data,
		token,
		feeToken,
		prioritizationFee,
		isApproval = false,
		unreviewed = false,
		onApprove,
		onReject
	}: Props = $props();

	let balance = $derived($balancesStore?.[token.id]?.data);

	let feeBalance = $derived($balancesStore?.[feeToken.id]?.data);

	let feeExchangeRate = $derived($exchanges?.[feeToken.id]?.usd);

	// Two triggers, because the fee that empties an account is not necessarily a big number: it is
	// whatever is big next to that account's balance. The absolute threshold still stands on its
	// own, so the warning also works before the balance is known.
	let highPrioritizationFee = $derived(
		nonNullish(prioritizationFee) &&
			(prioritizationFee >= SOLANA_HIGH_PRIORITIZATION_FEE_IN_LAMPORTS ||
				(nonNullish(feeBalance) &&
					feeBalance > ZERO &&
					prioritizationFee * SOLANA_HIGH_PRIORITIZATION_FEE_BALANCE_DIVISOR > feeBalance))
	);
</script>

<ContentWithToolbar>
	<SendData
		{amount}
		{application}
		{balance}
		destination={isApproval ? null : destination}
		{source}
		{token}
	>
		{#if isApproval}
			<SendDataSpender spender={destination} />
		{/if}

		<FeeDisplay
			decimals={feeToken.decimals}
			exchangeRate={feeExchangeRate}
			feeAmount={SOLANA_TRANSACTION_FEE_IN_LAMPORTS}
			symbol={feeToken.symbol}
		>
			{#snippet label()}
				<span>{$i18n.fee.text.network_fee}</span>
			{/snippet}
		</FeeDisplay>

		{#if nonNullish(prioritizationFee)}
			<FeeDisplay
				decimals={feeToken.decimals}
				exchangeRate={feeExchangeRate}
				feeAmount={prioritizationFee}
				symbol={feeToken.symbol}
			>
				{#snippet label()}
					<span>{$i18n.fee.text.prioritization_fee}</span>
				{/snippet}
			</FeeDisplay>
		{/if}

		{#if unreviewed}
			<MessageBox level="warning">{$i18n.wallet_connect.text.unreviewed_instructions}</MessageBox>
		{/if}

		<!-- A steep priority fee is a legitimate choice when the network is congested, so it warns
		     instead of blocking the way invalid typed data does on Ethereum. -->
		{#if highPrioritizationFee}
			<MessageBox level="warning">{$i18n.wallet_connect.text.high_prioritization_fee}</MessageBox>
		{/if}

		<WalletConnectData {data} label={$i18n.wallet_connect.text.hex_data} />

		<!-- TODO: add checks for insufficient funds if and when we are able to correctly parse the amount -->

		{#snippet sourceNetwork()}
			<ReviewNetwork sourceNetwork={token.network} />
		{/snippet}
	</SendData>

	{#snippet toolbar()}
		<WalletConnectActions {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
