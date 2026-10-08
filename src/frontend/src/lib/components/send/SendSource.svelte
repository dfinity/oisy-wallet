<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ContactOrToken from '$lib/components/contact/ContactOrToken.svelte';
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
		showBalance?: boolean;
		showSigner?: boolean;
	}

	let {
		token,
		balance,
		source,
		exchangeRate,
		showBalance = true,
		showSigner = true
	}: Props = $props();
</script>

{#if showBalance}
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
{/if}

{#if showSigner}
	<WalletConnectModalValue label={$i18n.wallet_connect.text.signer} ref="signer">
		<div class="flex flex-col gap-1">
			{source}
			<ContactOrToken identifier={source} />
		</div>
	</WalletConnectModalValue>
{/if}
