<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { BTC_MAINNET_TOKEN, BTC_REGTEST_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens.btc.env';
	import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
	import { icpAccountIdentifierText, icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import ReceiveAddressWithLogo from '$lib/components/receive/ReceiveAddressWithLogo.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { LOCAL } from '$lib/constants/app.constants';
	import {
		RECEIVE_TOKENS_MODAL_ICRC_SECTION,
		RECEIVE_TOKENS_MODAL_ICP_SECTION,
		RECEIVE_TOKENS_MODAL_ETH_SECTION,
		RECEIVE_TOKENS_MODAL_BTC_MAINNET_SECTION,
		RECEIVE_TOKENS_MODAL_DONE_BUTTON,
		RECEIVE_TOKENS_MODAL_BTC_TESTNET_SECTION,
		RECEIVE_TOKENS_MODAL_BTC_REGTEST_SECTION
	} from '$lib/constants/test-ids.constants';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet,
		ethAddress
	} from '$lib/derived/address.derived';
	import { testnets } from '$lib/derived/testnets.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { ReceiveQRCode } from '$lib/types/receive';

	const dispatch = createEventDispatcher();

	const displayQRCode = (details: Omit<Required<ReceiveQRCode>, 'qrCodeAriaLabel'>) =>
		dispatch('icQRCode', details);
</script>

<ContentWithToolbar>
	<ReceiveAddressWithLogo
		on:click={() =>
			displayQRCode({
				address: $icrcAccountIdentifierText ?? '',
				addressLabel: $i18n.receive.icp.text.principal,
				addressToken: ICP_TOKEN,
				copyAriaLabel: $i18n.receive.icp.text.internet_computer_principal_copied
			})}
		address={$icrcAccountIdentifierText ?? ''}
		token={ICP_TOKEN}
		qrCodeAriaLabel={$i18n.receive.icp.text.display_internet_computer_principal_qr}
		copyAriaLabel={$i18n.receive.icp.text.internet_computer_principal_copied}
		testId={RECEIVE_TOKENS_MODAL_ICRC_SECTION}
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
				addressLabel: $i18n.receive.icp.text.icp_account,
				addressToken: ICP_TOKEN,
				copyAriaLabel: $i18n.receive.icp.text.icp_account_copied
			})}
		address={$icpAccountIdentifierText ?? ''}
		token={ICP_TOKEN}
		qrCodeAriaLabel={$i18n.receive.icp.text.display_icp_account_qr}
		copyAriaLabel={$i18n.receive.icp.text.icp_account_copied}
		testId={RECEIVE_TOKENS_MODAL_ICP_SECTION}
		invisibleLogo
	>
		{$i18n.receive.icp.text.icp_account}

		<span slot="notes" class="text-secondary text-sm"
			>{$i18n.receive.icp.text.use_for_icp_deposit}</span
		>
	</ReceiveAddressWithLogo>

	<Hr spacing="lg" />

	<ReceiveAddressWithLogo
		on:click={() =>
			displayQRCode({
				address: $btcAddressMainnet ?? '',
				addressLabel: $i18n.receive.bitcoin.text.bitcoin_address,
				addressToken: BTC_MAINNET_TOKEN,
				copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied
			})}
		address={$btcAddressMainnet}
		token={BTC_MAINNET_TOKEN}
		qrCodeAriaLabel={$i18n.receive.bitcoin.text.display_bitcoin_address_qr}
		copyAriaLabel={$i18n.receive.bitcoin.text.bitcoin_address_copied}
		testId={RECEIVE_TOKENS_MODAL_BTC_MAINNET_SECTION}
	>
		{$i18n.receive.bitcoin.text.bitcoin_address}
	</ReceiveAddressWithLogo>

	{#if $testnets}
		<ReceiveAddressWithLogo
			on:click={() =>
				displayQRCode({
					address: $btcAddressTestnet ?? '',
					addressLabel: $i18n.receive.bitcoin.text.bitcoin_testnet_address,
					addressToken: BTC_TESTNET_TOKEN,
					copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied
				})}
			address={$btcAddressTestnet}
			token={BTC_TESTNET_TOKEN}
			qrCodeAriaLabel={$i18n.receive.bitcoin.text.display_bitcoin_address_qr}
			copyAriaLabel={$i18n.receive.bitcoin.text.bitcoin_address_copied}
			testId={RECEIVE_TOKENS_MODAL_BTC_TESTNET_SECTION}
		>
			{$i18n.receive.bitcoin.text.bitcoin_testnet_address}
		</ReceiveAddressWithLogo>

		{#if LOCAL}
			<!-- Same address for Regtest and for Testnet are used. -->
			<ReceiveAddressWithLogo
				on:click={() =>
					displayQRCode({
						address: $btcAddressRegtest ?? '',
						addressLabel: $i18n.receive.bitcoin.text.bitcoin_regtest_address,
						addressToken: BTC_REGTEST_TOKEN,
						copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied
					})}
				address={$btcAddressRegtest}
				token={BTC_REGTEST_TOKEN}
				qrCodeAriaLabel={$i18n.receive.bitcoin.text.display_bitcoin_address_qr}
				copyAriaLabel={$i18n.receive.bitcoin.text.bitcoin_address_copied}
				testId={RECEIVE_TOKENS_MODAL_BTC_REGTEST_SECTION}
			>
				{$i18n.receive.bitcoin.text.bitcoin_regtest_address}
			</ReceiveAddressWithLogo>
		{/if}
	{/if}

	<Hr spacing="lg" />

	<ReceiveAddressWithLogo
		on:click={() =>
			displayQRCode({
				address: $ethAddress ?? '',
				addressLabel: $i18n.receive.ethereum.text.ethereum_address,
				addressToken: ETHEREUM_TOKEN,
				copyAriaLabel: $i18n.receive.ethereum.text.ethereum_address_copied
			})}
		address={$ethAddress ?? ''}
		token={ETHEREUM_TOKEN}
		qrCodeAriaLabel={$i18n.receive.ethereum.text.display_ethereum_address_qr}
		copyAriaLabel={$i18n.receive.ethereum.text.ethereum_address_copied}
		testId={RECEIVE_TOKENS_MODAL_ETH_SECTION}
	>
		{$i18n.receive.ethereum.text.ethereum}
	</ReceiveAddressWithLogo>

	<ButtonDone
		testId={RECEIVE_TOKENS_MODAL_DONE_BUTTON}
		on:click={modalStore.close}
		slot="toolbar"
	/>
</ContentWithToolbar>
