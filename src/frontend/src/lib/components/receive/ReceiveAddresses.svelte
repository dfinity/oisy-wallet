<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		BTC_MAINNET_NETWORK,
		BTC_REGTEST_NETWORK,
		BTC_TESTNET_NETWORK,
		ETHEREUM_NETWORK,
		ICP_NETWORK
	} from '$env/networks.env';
	import { BTC_MAINNET_TOKEN, BTC_REGTEST_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens.btc.env';
	import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
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
	import type { ReceiveQRCode } from '$lib/types/receive';

	const dispatch = createEventDispatcher();

	const displayQRCode = (details: Omit<Required<ReceiveQRCode>, 'qrCodeAriaLabel'>) =>
		dispatch('icQRCode', details);
</script>

<ContentWithToolbar>
	<div class="flex flex-col gap-2">
		<ReceiveAddress
			labelRef="btcAddressMainnet"
			on:click={() =>
				displayQRCode({
					address: $btcAddressMainnet ?? '',
					addressLabel: $i18n.receive.bitcoin.text.bitcoin_address,
					addressToken: BTC_MAINNET_TOKEN,
					copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied
				})}
			address={$btcAddressMainnet}
			network={BTC_MAINNET_NETWORK}
			qrCodeAction={{
				enabled: true,

				testId: RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON,
				ariaLabel: $i18n.receive.bitcoin.text.display_bitcoin_address_qr
			}}
			copyAriaLabel={$i18n.receive.bitcoin.text.bitcoin_address_copied}
			testId={RECEIVE_TOKENS_MODAL_BTC_MAINNET_SECTION}
		>
			<svelte:fragment slot="title">{$i18n.receive.bitcoin.text.bitcoin_address}</svelte:fragment>
		</ReceiveAddress>

		{#if $testnets}
			<ReceiveAddress
				labelRef="btcAddressTestnet"
				on:click={() =>
					displayQRCode({
						address: $btcAddressTestnet ?? '',
						addressLabel: $i18n.receive.bitcoin.text.bitcoin_testnet_address,
						addressToken: BTC_TESTNET_TOKEN,
						copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied
					})}
				address={$btcAddressTestnet}
				network={BTC_TESTNET_NETWORK}
				qrCodeAction={{
					enabled: true,

					testId: RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON,
					ariaLabel: $i18n.receive.bitcoin.text.display_bitcoin_address_qr
				}}
				copyAriaLabel={$i18n.receive.bitcoin.text.bitcoin_address_copied}
				testId={RECEIVE_TOKENS_MODAL_BTC_TESTNET_SECTION}
			>
				<svelte:fragment slot="title"
					>{$i18n.receive.bitcoin.text.bitcoin_testnet_address}</svelte:fragment
				>
			</ReceiveAddress>

			{#if LOCAL}
				<!-- Same address for Regtest and for Testnet are used. -->
				<ReceiveAddress
					labelRef="btcAddressRegtest"
					on:click={() =>
						displayQRCode({
							address: $btcAddressRegtest ?? '',
							addressLabel: $i18n.receive.bitcoin.text.bitcoin_regtest_address,
							addressToken: BTC_REGTEST_TOKEN,
							copyAriaLabel: $i18n.receive.bitcoin.text.bitcoin_address_copied
						})}
					address={$btcAddressRegtest}
					network={BTC_REGTEST_NETWORK}
					qrCodeAction={{
						enabled: true,
						testId: RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON,
						ariaLabel: $i18n.receive.bitcoin.text.display_bitcoin_address_qr
					}}
					copyAriaLabel={$i18n.receive.bitcoin.text.bitcoin_address_copied}
					testId={RECEIVE_TOKENS_MODAL_BTC_REGTEST_SECTION}
				>
					<svelte:fragment slot="title"
						>{$i18n.receive.bitcoin.text.bitcoin_regtest_address}</svelte:fragment
					>
				</ReceiveAddress>
			{/if}
		{/if}

		<ReceiveAddress
			labelRef="ethAddress"
			on:click={() =>
				displayQRCode({
					address: $ethAddress ?? '',
					addressLabel: $i18n.receive.ethereum.text.ethereum_address,
					addressToken: ETHEREUM_TOKEN,
					copyAriaLabel: $i18n.receive.ethereum.text.ethereum_address_copied
				})}
			address={$ethAddress}
			network={ETHEREUM_NETWORK}
			qrCodeAction={{
				enabled: true,
				testId: RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON,
				ariaLabel: $i18n.receive.ethereum.text.display_ethereum_address_qr
			}}
			copyAriaLabel={$i18n.receive.ethereum.text.ethereum_address_copied}
			testId={RECEIVE_TOKENS_MODAL_ETH_SECTION}
		>
			<svelte:fragment slot="title">{$i18n.receive.ethereum.text.ethereum}</svelte:fragment>

			<span slot="text" class="text-secondary text-sm"
				>{$i18n.receive.icp.text.your_private_eth_address}</span
			>
		</ReceiveAddress>

		<ReceiveAddress
			labelRef="icrcTokenAddress"
			on:click={() =>
				displayQRCode({
					address: $icrcAccountIdentifierText ?? '',
					addressLabel: $i18n.receive.icp.text.principal,
					addressToken: ICP_TOKEN,
					copyAriaLabel: $i18n.receive.icp.text.internet_computer_principal_copied
				})}
			address={$icrcAccountIdentifierText}
			network={ICP_NETWORK}
			qrCodeAction={{
				enabled: true,
				testId: RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON,
				ariaLabel: $i18n.receive.icp.text.display_internet_computer_principal_qr
			}}
			copyAriaLabel={$i18n.receive.icp.text.internet_computer_principal_copied}
			testId={RECEIVE_TOKENS_MODAL_ICRC_SECTION}
		>
			<svelte:fragment slot="title">{$i18n.receive.icp.text.principal}</svelte:fragment>

			<span slot="text" class="text-secondary text-sm"
				>{$i18n.receive.icp.text.use_for_icrc_deposit}</span
			>
		</ReceiveAddress>

		<ReceiveAddress
			labelRef="icpTokenAddress"
			on:click={() =>
				displayQRCode({
					address: $icpAccountIdentifierText ?? '',
					addressLabel: $i18n.receive.icp.text.icp_account,
					addressToken: ICP_TOKEN,
					copyAriaLabel: $i18n.receive.icp.text.icp_account_copied
				})}
			address={$icpAccountIdentifierText}
			network={ICP_NETWORK}
			qrCodeAction={{
				enabled: true,

				testId: RECEIVE_TOKENS_MODAL_QR_CODE_BUTTON,
				ariaLabel: $i18n.receive.icp.text.display_icp_account_qr
			}}
			copyAriaLabel={$i18n.receive.icp.text.icp_account_copied}
			testId={RECEIVE_TOKENS_MODAL_ICP_SECTION}
		>
			<svelte:fragment slot="title">{$i18n.receive.icp.text.icp_account}</svelte:fragment>
		</ReceiveAddress>
	</div>

	<ButtonDone
		testId={RECEIVE_TOKENS_MODAL_DONE_BUTTON}
		on:click={modalStore.close}
		slot="toolbar"
	/>
</ContentWithToolbar>
