<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { CAIP10_CHAINS } from '$env/caip10-chains.env';
	import { EIP155_CHAINS } from '$env/eip155-chains.env';
	import EthEthWalletConnectSignModal from '$eth/components/wallet-connect/EthWalletConnectSignModal.svelte';
	import { modalWalletConnectSign } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import SolWalletConnectSignModal from '$sol/components/wallet-connect/SolWalletConnectSignModal.svelte';
	import { enabledSolanaNetworks } from '$sol/derived/networks.derived';
	import type { SolanaNetwork } from '$sol/types/network';

	export let listener: OptionWalletConnectListener;

	let request: WalletKitTypes.SessionRequest | undefined;
	$: request = $modalWalletConnectSign
		? ($modalStore?.data as WalletKitTypes.SessionRequest | undefined)
		: undefined;

	let ethChainId: number | undefined;
	$: ethChainId = nonNullish(request?.params.chainId)
		? EIP155_CHAINS[request.params.chainId]?.chainId
		: undefined;

	let solChainId: string | undefined;
	$: solChainId = nonNullish(request?.params.chainId)
		? CAIP10_CHAINS[request.params.chainId]?.chainId
		: undefined;

	let sourceSolNetwork: SolanaNetwork | undefined;
	$: sourceSolNetwork = nonNullish(solChainId)
		? $enabledSolanaNetworks.find(({ chainId: cId }) => cId === solChainId)
		: undefined;
</script>

{#if $modalWalletConnectSign && nonNullish(request)}
	{#if nonNullish(ethChainId)}
		<EthEthWalletConnectSignModal {request} bind:listener />
	{:else if nonNullish(solChainId) && nonNullish(sourceSolNetwork)}
		<SolWalletConnectSignModal network={sourceSolNetwork} {request} bind:listener />
	{/if}
{/if}
