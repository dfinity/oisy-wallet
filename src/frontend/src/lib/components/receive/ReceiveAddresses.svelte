<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { BTC_MAINNET_TOKEN, BTC_REGTEST_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens.btc.env';
	import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
	import EthReceiveMetamask from '$eth/components/receive/EthReceiveMetamask.svelte';
	import { icpAccountIdentifierText, icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import ReceiveAddressWithLogo from '$lib/components/receive/ReceiveAddressWithLogo.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { LOCAL } from '$lib/constants/app.constants';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet,
		ethAddress
	} from '$lib/derived/address.derived';
	import { testnets } from '$lib/derived/testnets.derived';
	import { i18n } from '$lib/stores/i18n.store';

	const dispatch = createEventDispatcher();

	const displayQRCode = (details: { address: string; addressLabel: string }) =>
		dispatch('icQRCode', details);
</script>

<ReceiveAddressWithLogo
	on:click={() =>
		displayQRCode({
			address: $icrcAccountIdentifierText ?? '',
			addressLabel: $i18n.receive.icp.text.principal
		})}
	address={$icrcAccountIdentifierText ?? ''}
	token={ICP_TOKEN}
	qrCodeAriaLabel={$i18n.receive.icp.text.display_internet_computer_principal_qr}
	copyAriaLabel={$i18n.receive.icp.text.internet_computer_principal_copied}
>
	{$i18n.receive.icp.text.principal}

	<span slot="notes" class="text-secondary text-sm"
		>{$i18n.receive.icp.text.use_for_icrc_deposit}</span
	>
</ReceiveAddressWithLogo>

<ReceiveAddressWithLogo
	on:click={() =>
		displayQRCode({
			address: $icpAccountIdentifierText ?? '',
			addressLabel: $i18n.receive.icp.text.icp_account
		})}
	address={$icpAccountIdentifierText ?? ''}
	token={ICP_TOKEN}
	qrCodeAriaLabel={$i18n.receive.icp.text.display_icp_account_qr}
	copyAriaLabel={$i18n.receive.icp.text.icp_account_copied}
	invisibleLogo
>
	{$i18n.receive.icp.text.icp_account}

	<span slot="notes" class="text-secondary text-sm"
		>{$i18n.receive.icp.text.use_for_icp_deposit}</span
	>
</ReceiveAddressWithLogo>

<div class="mb-6">
	<Hr />
</div>

<ReceiveAddressWithLogo
	on:click={() =>
		displayQRCode({
			address: $btcAddressMainnet ?? '',
			addressLabel: $i18n.receive.bitcoin.text.bitcoin_address
		})}
	address={$btcAddressMainnet}
	token={BTC_MAINNET_TOKEN}
	qrCodeAriaLabel={$i18n.receive.bitcoin.text.display_bitcoin_address_qr}
	copyAriaLabel={$i18n.receive.bitcoin.text.bitcoin_address_copied}
>
	{$i18n.receive.bitcoin.text.bitcoin_address}
</ReceiveAddressWithLogo>

{#if $testnets}
	<ReceiveAddressWithLogo
		on:click={() =>
			displayQRCode({
				address: $btcAddressTestnet ?? '',
				addressLabel: $i18n.receive.bitcoin.text.bitcoin_testnet_address
			})}
		address={$btcAddressTestnet}
		token={BTC_TESTNET_TOKEN}
		qrCodeAriaLabel={$i18n.receive.bitcoin.text.display_bitcoin_address_qr}
		copyAriaLabel={$i18n.receive.bitcoin.text.bitcoin_address_copied}
	>
		{$i18n.receive.bitcoin.text.bitcoin_testnet_address}
	</ReceiveAddressWithLogo>

	{#if LOCAL}
		<!-- Same address for Regtest and for Testnet are used. -->
		<ReceiveAddressWithLogo
			on:click={() =>
				displayQRCode({
					address: $btcAddressRegtest ?? '',
					addressLabel: $i18n.receive.bitcoin.text.bitcoin_regtest_address
				})}
			address={$btcAddressRegtest}
			token={BTC_REGTEST_TOKEN}
			qrCodeAriaLabel={$i18n.receive.bitcoin.text.display_bitcoin_address_qr}
			copyAriaLabel={$i18n.receive.bitcoin.text.bitcoin_address_copied}
		>
			{$i18n.receive.bitcoin.text.bitcoin_regtest_address}
		</ReceiveAddressWithLogo>
	{/if}
{/if}

<div class="mb-6">
	<Hr />
</div>

<ReceiveAddressWithLogo
	on:click={() =>
		displayQRCode({
			address: $ethAddress ?? '',
			addressLabel: $i18n.receive.ethereum.text.ethereum_address
		})}
	address={$ethAddress ?? ''}
	token={ETHEREUM_TOKEN}
	qrCodeAriaLabel={$i18n.receive.ethereum.text.display_ethereum_address_qr}
	copyAriaLabel={$i18n.receive.ethereum.text.ethereum_address_copied}
>
	{$i18n.receive.ethereum.text.ethereum}
</ReceiveAddressWithLogo>

<EthReceiveMetamask />
