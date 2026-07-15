<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import BtcWalletConnectSignModal from '$btc/components/wallet-connect/BtcWalletConnectSignModal.svelte';
	import BtcWalletConnectSignPsbtModal from '$btc/components/wallet-connect/BtcWalletConnectSignPsbtModal.svelte';
	import { SESSION_REQUEST_BTC_SIGN_PSBT } from '$btc/constants/wallet-connect.constants';
	import { BIP122_CHAINS } from '$env/bip122-chains.env';
	import { CAIP10_CHAINS } from '$env/caip10-chains.env';
	import { EIP155_CHAINS } from '$env/eip155-chains.env';
	import { BTC_MAINNET_NETWORK_ID, BTC_TESTNET_NETWORK_ID } from '$env/networks/networks.btc.env';
	import EthWalletConnectSignModal from '$eth/components/wallet-connect/EthWalletConnectSignModal.svelte';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet
	} from '$lib/derived/address.derived';
	import { modalWalletConnectSign } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { walletConnectListenerStore } from '$lib/stores/wallet-connect.store';
	import SolWalletConnectSignModal from '$sol/components/wallet-connect/SolWalletConnectSignModal.svelte';
	import { enabledSolanaNetworks } from '$sol/derived/networks.derived';

	let listener = $derived($walletConnectListenerStore);

	let request = $derived(
		$modalWalletConnectSign
			? ($modalStore?.data as WalletKitTypes.SessionRequest | undefined)
			: undefined
	);

	let ethChainId = $derived(
		nonNullish(request?.params.chainId) ? EIP155_CHAINS[request.params.chainId]?.chainId : undefined
	);

	let solChainId = $derived(
		nonNullish(request?.params.chainId) ? CAIP10_CHAINS[request.params.chainId]?.chainId : undefined
	);

	let sourceSolNetwork = $derived(
		nonNullish(solChainId)
			? $enabledSolanaNetworks.find(({ chainId: cId }) => cId === solChainId)
			: undefined
	);

	let btcChain = $derived(
		nonNullish(request?.params.chainId) ? BIP122_CHAINS[request.params.chainId] : undefined
	);

	let btcAddress = $derived(
		nonNullish(btcChain)
			? btcChain.networkId === BTC_MAINNET_NETWORK_ID
				? $btcAddressMainnet
				: btcChain.networkId === BTC_TESTNET_NETWORK_ID
					? $btcAddressTestnet
					: $btcAddressRegtest
			: undefined
	);
</script>

{#if $modalWalletConnectSign && nonNullish(request)}
	{#key request.id}
		{#if nonNullish(ethChainId)}
			<EthWalletConnectSignModal {listener} {request} />
		{:else if nonNullish(solChainId) && nonNullish(sourceSolNetwork)}
			<SolWalletConnectSignModal {listener} network={sourceSolNetwork} {request} />
		{:else if nonNullish(btcChain)}
			{#if request.params.request.method === SESSION_REQUEST_BTC_SIGN_PSBT}
				<BtcWalletConnectSignPsbtModal address={btcAddress} {listener} {request} />
			{:else}
				<BtcWalletConnectSignModal address={btcAddress} {listener} {request} />
			{/if}
		{/if}
	{/key}
{/if}
