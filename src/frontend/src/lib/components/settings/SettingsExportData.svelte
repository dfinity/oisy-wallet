<script lang="ts">
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { btcStatusesStore } from '$icp/stores/btc.store';
	import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		btcAddressMainnet,
		btcAddressTestnet,
		ethAddress,
		solAddressDevnet,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { enabledFungibleTokensUi } from '$lib/derived/tokens-ui.derived';
	import { enabledFungibleTokens, nativeTokens } from '$lib/derived/tokens.derived';
	import { exportTokensCsv, exportTransactionsCsv } from '$lib/services/export-data.services';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import { mapAllTransactionsUi } from '$lib/utils/transactions.utils';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';

	let exportingTokens = $state(false);
	let exportingTransactions = $state(false);

	const onExportTokens = () => {
		exportingTokens = true;
		try {
			exportTokensCsv({
				tokens: $enabledFungibleTokensUi,
				currency: $currentCurrency,
				exchangeRateToUsd: $currencyExchangeStore.exchangeRateToUsd
			});
		} finally {
			exportingTokens = false;
		}
	};

	const onExportTransactions = async () => {
		exportingTransactions = true;
		try {
			const nativeSymbolByNetworkId = (networkId: NetworkId): string | undefined =>
				$nativeTokens.find(({ network: { id } }) => id === networkId)?.symbol;

			const userAddresses = {
				btc: $btcAddressMainnet ?? $btcAddressTestnet,
				eth: $ethAddress,
				icp: $authIdentity?.getPrincipal().toText(),
				sol: $solAddressMainnet ?? $solAddressDevnet
			};

			await exportTransactionsCsv({
				identity: $authIdentity,
				tokens: $enabledFungibleTokens,
				userAddresses,
				nativeSymbolByNetworkId,
				buildTransactions: () =>
					mapAllTransactionsUi({
						tokens: $enabledFungibleTokens,
						$btcTransactions: $btcTransactionsStore,
						$ethTransactions: $ethTransactionsStore,
						$ckEthMinterInfo: $ckEthMinterInfoStore,
						$ethAddress,
						$btcStatuses: $btcStatusesStore,
						$solTransactions: $solTransactionsStore,
						$icTransactionsStore,
						$ckBtcMinterInfoStore,
						$icPendingTransactionsStore,
						$ckBtcPendingUtxosStore
					})
			});
		} finally {
			exportingTransactions = false;
		}
	};
</script>

<SettingsCard>
	{#snippet title()}{$i18n.settings.text.export_data}{/snippet}

	<SettingsCardItem>
		{#snippet key()}
			{$i18n.settings.text.export_tokens}
		{/snippet}

		{#snippet value()}
			<Button
				colorStyle="primary"
				disabled={exportingTokens || exportingTransactions}
				onclick={onExportTokens}>{$i18n.settings.text.export_tokens}</Button
			>
		{/snippet}

		{#snippet info()}
			{$i18n.settings.text.export_tokens_description}
		{/snippet}
	</SettingsCardItem>

	<SettingsCardItem>
		{#snippet key()}
			{$i18n.settings.text.export_transactions}
		{/snippet}

		{#snippet value()}
			<Button
				colorStyle="primary"
				disabled={exportingTokens || exportingTransactions}
				loading={exportingTransactions}
				onclick={onExportTransactions}
				>{exportingTransactions
					? $i18n.settings.text.export_in_progress
					: $i18n.settings.text.export_transactions}</Button
			>
		{/snippet}

		{#snippet info()}
			{$i18n.settings.text.export_transactions_description}
		{/snippet}
	</SettingsCardItem>
</SettingsCard>
