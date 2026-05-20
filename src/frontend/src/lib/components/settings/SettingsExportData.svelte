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
	import { allContacts } from '$lib/derived/contacts.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { enabledFungibleTokensUi } from '$lib/derived/tokens-ui.derived';
	import { enabledFungibleTokens, nativeTokens } from '$lib/derived/tokens.derived';
	import {
		exportTokensCsv,
		exportTransactionsCsv,
		type TokenCsvVariant,
		type TransactionCsvVariant
	} from '$lib/services/export-data.services';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import { mapAllTransactionsUi } from '$lib/utils/transactions.utils';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';

	let exportingTokens = $state(false);
	let exportingTransactions = $state(false);

	const onExportTokens = (variant: TokenCsvVariant) => {
		exportingTokens = true;
		try {
			exportTokensCsv({
				tokens: $enabledFungibleTokensUi,
				currency: $currentCurrency,
				exchangeRateToUsd: $currencyExchangeStore.exchangeRateToUsd,
				variant
			});
		} finally {
			exportingTokens = false;
		}
	};

	const onExportTransactions = async (variant: TransactionCsvVariant) => {
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
				contacts: $allContacts,
				variant,
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

	<h5 class="text-xs font-semibold tracking-wide text-tertiary uppercase">
		{$i18n.settings.text.export_basic}
	</h5>

	<SettingsCardItem>
		{#snippet key()}
			{$i18n.settings.text.export_tokens}
		{/snippet}

		{#snippet value()}
			<Button
				ariaLabel={`${$i18n.settings.text.export_tokens} (${$i18n.settings.text.export_basic})`}
				disabled={exportingTokens || exportingTransactions}
				link
				onclick={() => onExportTokens('basic')}>{$i18n.core.text.download} ></Button
			>
		{/snippet}

		{#snippet info()}
			{$i18n.settings.text.export_tokens_basic_description}
		{/snippet}
	</SettingsCardItem>

	<SettingsCardItem>
		{#snippet key()}
			{$i18n.settings.text.export_transactions}
		{/snippet}

		{#snippet value()}
			<Button
				ariaLabel={`${$i18n.settings.text.export_transactions} (${$i18n.settings.text.export_basic})`}
				disabled={exportingTokens || exportingTransactions}
				link
				loading={exportingTransactions}
				onclick={() => onExportTransactions('basic')}>{$i18n.core.text.download} ></Button
			>
		{/snippet}

		{#snippet info()}
			{$i18n.settings.text.export_transactions_basic_description}
		{/snippet}
	</SettingsCardItem>

	<h5 class="mt-5 text-xs font-semibold tracking-wide text-tertiary uppercase">
		{$i18n.settings.text.export_extended}
	</h5>

	<SettingsCardItem>
		{#snippet key()}
			{$i18n.settings.text.export_tokens}
		{/snippet}

		{#snippet value()}
			<Button
				ariaLabel={`${$i18n.settings.text.export_tokens} (${$i18n.settings.text.export_extended})`}
				disabled={exportingTokens || exportingTransactions}
				link
				onclick={() => onExportTokens('extended')}>{$i18n.core.text.download} ></Button
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
				ariaLabel={`${$i18n.settings.text.export_transactions} (${$i18n.settings.text.export_extended})`}
				disabled={exportingTokens || exportingTransactions}
				link
				loading={exportingTransactions}
				onclick={() => onExportTransactions('extended')}>{$i18n.core.text.download} ></Button
			>
		{/snippet}

		{#snippet info()}
			{$i18n.settings.text.export_transactions_description}
		{/snippet}
	</SettingsCardItem>
</SettingsCard>
