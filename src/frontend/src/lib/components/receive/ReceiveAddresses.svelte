<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { page } from '$app/state';
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
	import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
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
	import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
	import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
	import { enabledEvmNetworks } from '$evm/derived/networks.derived';
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
		RECEIVE_TOKENS_MODAL_SOL_MAINNET_SECTION,
		RECEIVE_TOKENS_MODAL_XRP_MAINNET_SECTION
	} from '$lib/constants/test-ids.constants';
	import {
		networkBitcoinMainnetEnabled,
		networkBitcoinRegtestEnabled,
		networkBitcoinTestnetEnabled,
		networkSolanaDevnetEnabled,
		networkSolanaLocalEnabled,
		networkSolanaMainnetEnabled,
		networkXrpMainnetEnabled
	} from '$lib/derived/networks.derived';
	import { testnetsEnabled } from '$lib/derived/testnets.derived';
	import {
		btcAddressMainnetStore,
		btcAddressRegtestStore,
		btcAddressTestnetStore,
		ethAddressStore,
		solAddressDevnetStore,
		solAddressLocalnetStore,
		solAddressMainnetStore,
		xrpAddressMainnetStore,
		type AddressStoreData
	} from '$lib/stores/address.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Address } from '$lib/types/address';
	import type { Network } from '$lib/types/network';
	import type { ReceiveQRCode } from '$lib/types/receive';
	import type { OptionString } from '$lib/types/string';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isRouteNfts } from '$lib/utils/nav.utils';

	interface Props {
		onQRCode: (details: ReceiveQRCode) => void;
	}

	let { onQRCode }: Props = $props();

	const displayQRCode = (details: ReceiveQRCode) => onQRCode(details);

	let isNftsPage = $derived(isRouteNfts(page));

	// Copy and QR only for an address the backend certified, as in Receive.
	const certified = <T extends Address>(data: AddressStoreData<T>): OptionString =>
		nonNullish(data) && data.certified ? data.data : undefined;

	// One address serves every EVM network, so it is listed once, with the enabled networks that share it.
	let evmNetworks = $derived([...$enabledEthereumNetworks, ...$enabledEvmNetworks]);

	let evmNetworksText = $derived(
		replacePlaceholders($i18n.receive.addresses.text.evm_networks, {
			$networks: evmNetworks.map(({ name }) => name).join(', ')
		})
	);

	interface ReceiveAddressProps {
		labelRef: string;
		address: OptionString;
		network: Network;
		token: Token;
		testId: string;
		title: string;
		label: string;
		copyAriaLabel: string;
		qrCodeAriaLabel: string;
		text?: string;
		networks?: Network[];
		condition?: boolean;
		qrCodeAction: {
			enabled: true;
			testId: typeof RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON;
			ariaLabel: string;
			onClick: () => void;
		};
	}

	let receiveAddressCoreList = $derived<Omit<ReceiveAddressProps, 'qrCodeAction' | 'on'>[]>([
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
			title: $i18n.receive.icp.text.account_id,
			label: $i18n.receive.icp.text.account_id,
			copyAriaLabel: $i18n.receive.icp.text.account_id_copied,
			qrCodeAriaLabel: $i18n.receive.icp.text.display_account_id_qr,
			text: $i18n.receive.icp.text.use_for_icp_deposit
		},
		{
			labelRef: 'btcAddressMainnet',
			address: certified($btcAddressMainnetStore),
			network: BTC_MAINNET_NETWORK,
			token: BTC_MAINNET_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_BTC_MAINNET_SECTION,
			title: $i18n.receive.bitcoin.text.bitcoin_address_title,
			label: $i18n.receive.bitcoin.text.bitcoin_address,
			copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied,
			qrCodeAriaLabel: $i18n.receive.bitcoin.text.display_bitcoin_address_qr,
			condition: $networkBitcoinMainnetEnabled
		},
		{
			labelRef: 'btcAddressTestnet',
			address: certified($btcAddressTestnetStore),
			network: BTC_TESTNET_NETWORK,
			token: BTC_TESTNET_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_BTC_TESTNET_SECTION,
			title: $i18n.receive.bitcoin.text.bitcoin_testnet_address_title,
			label: $i18n.receive.bitcoin.text.bitcoin_testnet_address,
			copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied,
			qrCodeAriaLabel: $i18n.receive.bitcoin.text.display_bitcoin_address_qr,
			condition: $networkBitcoinTestnetEnabled && $testnetsEnabled
		},
		{
			labelRef: 'btcAddressRegtest',
			address: certified($btcAddressRegtestStore),
			network: BTC_REGTEST_NETWORK,
			token: BTC_REGTEST_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_BTC_REGTEST_SECTION,
			title: $i18n.receive.bitcoin.text.bitcoin_regtest_address_title,
			label: $i18n.receive.bitcoin.text.bitcoin_regtest_address,
			copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied,
			qrCodeAriaLabel: $i18n.receive.bitcoin.text.display_bitcoin_address_qr,
			condition: $networkBitcoinRegtestEnabled && $testnetsEnabled && LOCAL
		},
		{
			labelRef: 'ethAddress',
			address: certified($ethAddressStore),
			network: ETHEREUM_NETWORK,
			token: ETHEREUM_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_ETH_SECTION,
			title: $i18n.receive.addresses.text.evm_title,
			label: $i18n.receive.addresses.text.evm_title,
			copyAriaLabel: $i18n.receive.ethereum.text.ethereum_address_copied,
			qrCodeAriaLabel: $i18n.receive.ethereum.text.display_ethereum_address_qr,
			text: evmNetworksText,
			networks: evmNetworks,
			condition: evmNetworks.length > 0
		},
		{
			labelRef: 'solAddressMainnet',
			address: certified($solAddressMainnetStore),
			network: SOLANA_MAINNET_NETWORK,
			token: SOLANA_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_SOL_MAINNET_SECTION,
			title: $i18n.receive.solana.text.solana_address_title,
			label: $i18n.receive.solana.text.solana_address,
			copyAriaLabel: $i18n.receive.solana.text.solana_address_copied,
			qrCodeAriaLabel: $i18n.receive.solana.text.display_solana_address_qr,
			condition: $networkSolanaMainnetEnabled
		},
		{
			labelRef: 'solAddressDevnet',
			address: certified($solAddressDevnetStore),
			network: SOLANA_DEVNET_NETWORK,
			token: SOLANA_DEVNET_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_SOL_DEVNET_SECTION,
			title: $i18n.receive.solana.text.solana_devnet_address_title,
			label: $i18n.receive.solana.text.solana_devnet_address,
			copyAriaLabel: $i18n.receive.solana.text.solana_address_copied,
			qrCodeAriaLabel: $i18n.receive.solana.text.display_solana_address_qr,
			condition: $networkSolanaDevnetEnabled && $testnetsEnabled
		},
		{
			labelRef: 'solAddressLocal',
			address: certified($solAddressLocalnetStore),
			network: SOLANA_LOCAL_NETWORK,
			token: SOLANA_LOCAL_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_SOL_LOCAL_SECTION,
			title: $i18n.receive.solana.text.solana_local_address_title,
			label: $i18n.receive.solana.text.solana_local_address,
			copyAriaLabel: $i18n.receive.solana.text.solana_address_copied,
			qrCodeAriaLabel: $i18n.receive.solana.text.display_solana_address_qr,
			condition: $networkSolanaLocalEnabled && $testnetsEnabled && LOCAL
		},
		{
			labelRef: 'xrpAddressMainnet',
			address: certified($xrpAddressMainnetStore),
			network: XRP_MAINNET_NETWORK,
			token: XRP_TOKEN,
			testId: RECEIVE_TOKENS_MODAL_XRP_MAINNET_SECTION,
			title: $i18n.receive.xrp.text.xrp_address_title,
			label: $i18n.receive.xrp.text.xrp_address,
			copyAriaLabel: $i18n.receive.xrp.text.xrp_address_copied,
			qrCodeAriaLabel: $i18n.receive.xrp.text.display_xrp_address_qr,
			condition: $networkXrpMainnetEnabled
		}
	]);

	let receiveAddressList = $derived<
		Omit<ReceiveAddressProps, 'token' | 'qrCodeAriaLabel' | 'label'>[]
	>(
		receiveAddressCoreList.map(
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
				networks,
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
					ariaLabel: qrCodeAriaLabel,
					onClick: () =>
						displayQRCode({
							address: address ?? '',
							addressLabel,
							addressToken,
							copyAriaLabel,
							networks
						})
				}
			})
		)
	);
</script>

<ContentWithToolbar>
	<div class="flex flex-col gap-2">
		{#each receiveAddressList as { title: _title, text: _text, condition, labelRef, address, network, testId, copyAriaLabel, qrCodeAction } (labelRef)}
			{@const showAddress =
				condition !== false && (!isNftsPage || (isNftsPage && network.supportsNft))}

			{#if showAddress && nonNullish(_text)}
				<ReceiveAddress {address} {copyAriaLabel} {labelRef} {network} {qrCodeAction} {testId}>
					{#snippet title()}
						{_title}
					{/snippet}
					{#snippet text()}
						{_text}
					{/snippet}
				</ReceiveAddress>
			{:else if showAddress}
				<ReceiveAddress {address} {copyAriaLabel} {labelRef} {network} {qrCodeAction} {testId}>
					{#snippet title()}
						{_title}
					{/snippet}
				</ReceiveAddress>
			{/if}
		{/each}
	</div>

	{#snippet toolbar()}
		<ButtonDone onclick={modalStore.close} testId={RECEIVE_TOKENS_MODAL_DONE_BUTTON} />
	{/snippet}
</ContentWithToolbar>
