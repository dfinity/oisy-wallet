<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import {
		BTC_MAINNET_NETWORK,
		BTC_REGTEST_NETWORK,
		BTC_TESTNET_NETWORK
	} from '$env/networks/networks.btc.env';
	import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import {
		SOLANA_DEVNET_NETWORK,
		SOLANA_LOCAL_NETWORK,
		SOLANA_MAINNET_NETWORK
	} from '$env/networks/networks.sol.env';
	import {
		BTC_MAINNET_TOKEN,
		BTC_REGTEST_TOKEN,
		BTC_TESTNET_TOKEN
	} from '$env/tokens/tokens.btc.env';
	import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import { icpAccountIdentifierText, icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import ReceiveAddress from '$lib/components/receive/ReceiveAddress.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { LOCAL } from '$lib/constants/app.constants';
	import {
		RECEIVE_TOKENS_MODAL_BTC_MAINNET_SECTION,
		RECEIVE_TOKENS_MODAL_BTC_REGTEST_SECTION,
		RECEIVE_TOKENS_MODAL_BTC_TESTNET_SECTION,
		RECEIVE_TOKENS_MODAL_DONE_BUTTON,
		RECEIVE_TOKENS_MODAL_ETH_SECTION,
		RECEIVE_TOKENS_MODAL_ICP_SECTION,
		RECEIVE_TOKENS_MODAL_ICRC_SECTION,
		RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON,
		RECEIVE_TOKENS_MODAL_SOL_DEVNET_SECTION,
		RECEIVE_TOKENS_MODAL_SOL_LOCAL_SECTION,
		RECEIVE_TOKENS_MODAL_SOL_MAINNET_SECTION
	} from '$lib/constants/test-ids.constants';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet,
		ethAddress,
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import {
		networkBitcoinMainnetEnabled,
		networkBitcoinRegtestEnabled,
		networkBitcoinTestnetEnabled,
		networkEthereumEnabled,
		networkEvmMainnetEnabled,
		networkEvmTestnetEnabled,
		networkSepoliaEnabled,
		networkSolanaDevnetEnabled,
		networkSolanaLocalEnabled,
		networkSolanaMainnetEnabled
	} from '$lib/derived/networks.derived';
	import { testnetsEnabled } from '$lib/derived/testnets.derived';
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
		on: {
			click: () => void;
		};
		qrCodeAction: {
			enabled: true;
			testId: typeof RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON;
			ariaLabel: string;
		};
	}

	let receiveAddressCoreList: Omit<ReceiveAddressProps, 'qrCodeAction' | 'on'>[];
	$: receiveAddressCoreList = [
		{
			labelRef: 'btcAddressMainnet',
			address: $btcAddressMainnet,
			network: BTC_MAINNET_NETWORK,
			token: BTC_MAINNET_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_BTC_MAINNET_SECTION,
			title: $i18n.receive.bitcoin.text.bitcoin_address,
			label: $i18n.receive.bitcoin.text.bitcoin_address,
			copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied,
			qrCodeAriaLabel: $i18n.receive.bitcoin.text.display_bitcoin_address_qr,
			condition: $networkBitcoinMainnetEnabled
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
			condition: $networkBitcoinTestnetEnabled && $testnetsEnabled
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
			condition: $networkBitcoinRegtestEnabled && $testnetsEnabled && LOCAL
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
			text: $i18n.receive.icp.text.your_private_eth_address,
			condition:
				$networkEthereumEnabled ||
				$networkSepoliaEnabled ||
				$networkEvmMainnetEnabled ||
				$networkEvmTestnetEnabled
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
		},
		{
			labelRef: 'solAddressMainnet',
			address: $solAddressMainnet,
			network: SOLANA_MAINNET_NETWORK,
			token: SOLANA_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_SOL_MAINNET_SECTION,
			title: $i18n.receive.solana.text.solana_address,
			label: $i18n.receive.solana.text.solana_address,
			copyAriaLabel: $i18n.receive.solana.text.solana_address_copied,
			qrCodeAriaLabel: $i18n.receive.solana.text.display_solana_address_qr,
			condition: $networkSolanaMainnetEnabled
		},
		{
			labelRef: 'solAddressDevnet',
			address: $solAddressDevnet,
			network: SOLANA_DEVNET_NETWORK,
			token: SOLANA_DEVNET_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_SOL_DEVNET_SECTION,
			title: $i18n.receive.solana.text.solana_devnet_address,
			label: $i18n.receive.solana.text.solana_devnet_address,
			copyAriaLabel: $i18n.receive.solana.text.solana_address_copied,
			qrCodeAriaLabel: $i18n.receive.solana.text.display_solana_address_qr,
			condition: $networkSolanaDevnetEnabled && $testnetsEnabled
		},
		{
			labelRef: 'solAddressLocal',
			address: $solAddressLocal,
			network: SOLANA_LOCAL_NETWORK,
			token: SOLANA_LOCAL_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_SOL_LOCAL_SECTION,
			title: $i18n.receive.solana.text.solana_local_address,
			label: $i18n.receive.solana.text.solana_local_address,
			copyAriaLabel: $i18n.receive.solana.text.solana_address_copied,
			qrCodeAriaLabel: $i18n.receive.solana.text.display_solana_address_qr,
			condition: $networkSolanaLocalEnabled && $testnetsEnabled && LOCAL
		}
	];

	let receiveAddressList: Omit<ReceiveAddressProps, 'token' | 'qrCodeAriaLabel' | 'label'>[];
	$: receiveAddressList = receiveAddressCoreList.map(
		({
			address,
			token: addressToken,
			qrCodeAriaLabel,
			label: addressLabel,
			copyAriaLabel,
			labelRef,
			network,
			testId,
			title,
			text,
			condition
		}) => ({
			labelRef,
			address,
			network,
			testId,
			copyAriaLabel,
			title,
			text,
			condition,
			qrCodeAction: {
				enabled: true,
				testId: RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON,
				ariaLabel: qrCodeAriaLabel
			},
			on: {
				click: () =>
					displayQRCode({
						address: address ?? '',
						addressLabel,
						addressToken,
						copyAriaLabel
					})
			}
		})
	);
</script>

<ContentWithToolbar>
	<div class="flex flex-col gap-2">
		{#each receiveAddressList as { title: _title, text: _text, condition, on, labelRef, address, network, testId, copyAriaLabel, qrCodeAction } (labelRef)}
			{#if condition !== false}
				{#if nonNullish(_text)}
					<ReceiveAddress
						{address}
						{copyAriaLabel}
						{labelRef}
						{network}
						{qrCodeAction}
						{testId}
						on:click={on.click}
					>
						{#snippet title()}
							{_title}
						{/snippet}
						{#snippet text()}
							<span class="text-sm">{_text}</span>
						{/snippet}
					</ReceiveAddress>
				{:else}
					<ReceiveAddress
						{address}
						{copyAriaLabel}
						{labelRef}
						{network}
						{qrCodeAction}
						{testId}
						on:click={on.click}
					>
						{#snippet title()}
							{_title}
						{/snippet}
					</ReceiveAddress>
				{/if}
			{/if}
		{/each}
	</div>

	{#snippet toolbar()}
		<ButtonDone onclick={modalStore.close} testId={RECEIVE_TOKENS_MODAL_DONE_BUTTON} />
	{/snippet}
</ContentWithToolbar>
