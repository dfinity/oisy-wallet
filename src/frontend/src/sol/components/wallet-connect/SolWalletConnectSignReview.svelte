<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import SendDataSpender from '$lib/components/send/SendDataSpender.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import WalletConnectData from '$lib/components/wallet-connect/WalletConnectData.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
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

{#snippet feeValue(feeAmount: bigint)}
	{@const formattedFee = formatToken({
		value: feeAmount,
		unitName: feeToken.decimals,
		displayDecimals: feeToken.decimals
	})}

	<div class="flex gap-4">
		{`${formattedFee} ${feeToken.symbol}`}

		<div class="text-tertiary">
			<ConvertAmountExchange amount={formattedFee} exchangeRate={feeExchangeRate} />
		</div>
	</div>
{/snippet}

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

		<WalletConnectModalValue label={$i18n.fee.text.network_fee} ref="network-fee">
			{@render feeValue(SOLANA_TRANSACTION_FEE_IN_LAMPORTS)}
		</WalletConnectModalValue>

		{#if nonNullish(prioritizationFee)}
			<WalletConnectModalValue label={$i18n.fee.text.prioritization_fee} ref="prioritization-fee">
				{@render feeValue(prioritizationFee)}
			</WalletConnectModalValue>
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
			<WalletConnectModalValue label={$i18n.send.text.network} ref="network">
				<NetworkWithLogo network={token.network} />
			</WalletConnectModalValue>
		{/snippet}
	</SendData>

	{#snippet toolbar()}
		<WalletConnectActions {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
