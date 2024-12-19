<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import {
		BTC_MAINNET_NETWORK,
		BTC_REGTEST_NETWORK,
		BTC_TESTNET_NETWORK,
		ETHEREUM_NETWORK,
		ICP_NETWORK
	} from '$env/networks/networks.env';
	import {
		BTC_MAINNET_TOKEN,
		BTC_REGTEST_TOKEN,
		BTC_TESTNET_TOKEN
	} from '$env/tokens/tokens.btc.env';
	import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { icpAccountIdentifierText, icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import ReceiveAddress from '$lib/components/receive/ReceiveAddress.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { LOCAL } from '$lib/constants/app.constants';
	import {
		RECEIVE_TOKENS_MODAL_ICRC_SECTION,
		RECEIVE_TOKENS_MODAL_ICP_SECTION,
		RECEIVE_TOKENS_MODAL_ETH_SECTION,
		RECEIVE_TOKENS_MODAL_BTC_MAINNET_SECTION,
		RECEIVE_TOKENS_MODAL_DONE_BUTTON,
		RECEIVE_TOKENS_MODAL_BTC_TESTNET_SECTION,
		RECEIVE_TOKENS_MODAL_BTC_REGTEST_SECTION,
		RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON
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
	import type { OptionBtcAddress, OptionEthAddress } from '$lib/types/address';
	import type { Network } from '$lib/types/network';
	import type { ReceiveQRCode } from '$lib/types/receive';
	import type { Token } from '$lib/types/token';

	const dispatch = createEventDispatcher();

	const displayQRCode = (details: Omit<Required<ReceiveQRCode>, 'qrCodeAriaLabel'>) =>
		dispatch('icQRCode', details);

	interface ReceiveAddressProps {
		labelRef: string;
		address: OptionBtcAddress | OptionEthAddress;
		network: Network;
		token: Token;
		testId: string;
		title: string;
		label: string;
		copyAriaLabel: string;
		qrCodeAriaLabel: string;
		text?: string;
		condition?: boolean;
	}

	let receiveAddressList: ReceiveAddressProps[];
	$: receiveAddressList = [
		{
			labelRef: 'btcAddressMainnet',
			address: $btcAddressMainnet,
			network: BTC_MAINNET_NETWORK,
			token: BTC_MAINNET_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_BTC_MAINNET_SECTION,
			title: $i18n.receive.bitcoin.text.bitcoin_address,
			label: $i18n.receive.bitcoin.text.bitcoin_address,
			copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied,
			qrCodeAriaLabel: $i18n.receive.bitcoin.text.display_bitcoin_address_qr
		},
		{
			labelRef: 'btcAddressTestnet',
			address: $btcAddressTestnet,
			network: BTC_TESTNET_NETWORK,
			token: BTC_TESTNET_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_BTC_TESTNET_SECTION,
			title: $i18n.receive.bitcoin.text.bitcoin_testnet_address,
			label: $i18n.receive.bitcoin.text.bitcoin_testnet_address,
			copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied,
			qrCodeAriaLabel: $i18n.receive.bitcoin.text.display_bitcoin_address_qr,
			condition: $testnets
		},
		{
			labelRef: 'btcAddressRegtest',
			address: $btcAddressRegtest,
			network: BTC_REGTEST_NETWORK,
			token: BTC_REGTEST_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_BTC_REGTEST_SECTION,
			title: $i18n.receive.bitcoin.text.bitcoin_regtest_address,
			label: $i18n.receive.bitcoin.text.bitcoin_regtest_address,
			copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied,
			qrCodeAriaLabel: $i18n.receive.bitcoin.text.display_bitcoin_address_qr,
			condition: $testnets && LOCAL
		},
		{
			labelRef: 'ethAddress',
			address: $ethAddress,
			network: ETHEREUM_NETWORK,
			token: ETHEREUM_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_ETH_SECTION,
			title: $i18n.receive.ethereum.text.ethereum,
			label: $i18n.receive.ethereum.text.ethereum_address,
			copyAriaLabel: $i18n.receive.ethereum.text.ethereum_address_copied,
			qrCodeAriaLabel: $i18n.receive.ethereum.text.display_ethereum_address_qr,
			text: $i18n.receive.icp.text.your_private_eth_address
		},
		{
			labelRef: 'icrcTokenAddress',
			address: $icrcAccountIdentifierText,
			network: ICP_NETWORK,
			token: ICP_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_ICRC_SECTION,
			title: $i18n.receive.icp.text.principal,
			label: $i18n.receive.icp.text.principal,
			copyAriaLabel: $i18n.receive.icp.text.internet_computer_principal_copied,
			qrCodeAriaLabel: $i18n.receive.icp.text.display_internet_computer_principal_qr,
			text: $i18n.receive.icp.text.use_for_icrc_deposit
		},
		{
			labelRef: 'icpTokenAddress',
			address: $icpAccountIdentifierText,
			network: ICP_NETWORK,
			token: ICP_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_ICP_SECTION,
			title: $i18n.receive.icp.text.icp_account,
			label: $i18n.receive.icp.text.icp_account,
			copyAriaLabel: $i18n.receive.icp.text.icp_account_copied,
			qrCodeAriaLabel: $i18n.receive.icp.text.display_icp_account_qr
		}
	];
</script>

<ContentWithToolbar>
	<div class="flex flex-col gap-2">
		{#each receiveAddressList as { labelRef, address, network, token: addressToken, testId, title, label: addressLabel, copyAriaLabel, qrCodeAriaLabel, text, condition } (labelRef)}
			{#if condition !== false}
				<ReceiveAddress
					{labelRef}
					on:click={() =>
						displayQRCode({
							address: address ?? '',
							addressLabel,
							addressToken,
							copyAriaLabel
						})}
					{address}
					{network}
					qrCodeAction={{
						enabled: true,
						testId: RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON,
						ariaLabel: qrCodeAriaLabel
					}}
					{copyAriaLabel}
					{testId}
				>
					<svelte:fragment slot="title">{title}</svelte:fragment>
					<svelte:fragment slot="text">
						{#if nonNullish(text)}
							<span class="text-sm text-black">{text}</span>
						{/if}
					</svelte:fragment>
				</ReceiveAddress>
			{/if}
		{/each}
	</div>

	<ButtonDone
		testId={RECEIVE_TOKENS_MODAL_DONE_BUTTON}
		on:click={modalStore.close}
		slot="toolbar"
	/>
</ContentWithToolbar>
