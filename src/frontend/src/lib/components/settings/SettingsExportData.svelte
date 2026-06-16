<script lang="ts">
	import { slide } from 'svelte/transition';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { btcStatusesStore } from '$icp/stores/btc.store';
	import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import IconHelp from '$lib/components/icons/lucide/IconHelp.svelte';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_EXPORT_DATA_DOCS_URL } from '$lib/constants/oisy.constants';
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
	import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
	import { buildLearnMoreEvent } from '$lib/services/analytics.services';
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

	// Single help toggle on the card title — reveals one description for the whole feature
	// with a "Learn more" external link to the OISY docs (same pattern as the hide-micro
	// row in Settings.svelte).
	let helpExpanded = $state(false);

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
	{#snippet title()}
		<span class="inline-flex items-center">
			{$i18n.settings.text.export_data}
			<button
				class="text-tertiary ml-1 flex p-0.5 align-top"
				onclick={() => (helpExpanded = !helpExpanded)}
			>
				<IconHelp size="18" />
			</button>
		</span>
	{/snippet}

	{#if helpExpanded}
		<span class="text-tertiary -mt-3 mb-3 flex w-full text-sm" transition:slide>
			<span>
				{$i18n.settings.text.export_data_description}

				<ExternalLink
					ariaLabel={$i18n.settings.text.learn_more}
					href={OISY_EXPORT_DATA_DOCS_URL}
					iconVisible={false}
					trackEvent={buildLearnMoreEvent({
						sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SETTINGS_PAGE,
						sourceSublocation: 'export_data',
						labelKey: 'settings.text.learn_more',
						url: OISY_EXPORT_DATA_DOCS_URL
					})}>{$i18n.settings.text.learn_more}</ExternalLink
				>
			</span>
		</span>
	{/if}

	<h5 class="text-tertiary text-xs font-semibold tracking-wide uppercase">
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
	</SettingsCardItem>

	<h5 class="text-tertiary mt-5 text-xs font-semibold tracking-wide uppercase">
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
	</SettingsCardItem>
</SettingsCard>
