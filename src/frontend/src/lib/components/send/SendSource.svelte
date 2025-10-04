<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionToken } from '$lib/types/token';

	interface Props {
		token: OptionToken;
		balance: OptionBalance;
		source: string;
		exchangeRate?: number;
	}

	let { token, balance, source, exchangeRate = undefined }: Props = $props();
</script>

<WalletConnectModalValue label={$i18n.send.text.balance} ref="balance">
	{#if nonNullish(token)}
		<ExchangeAmountDisplay
			amount={balance ?? ZERO}
			decimals={token.decimals}
			{exchangeRate}
			symbol={token.symbol}
		/>
	{:else}
		&ZeroWidthSpace;
	{/if}
</WalletConnectModalValue>

<WalletConnectModalValue label={$i18n.send.text.source} ref="source">
	{source}
</WalletConnectModalValue>
