<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { CAIP10_CHAINS } from '$env/caip10-chains.env';
	import { EIP155_CHAINS } from '$env/eip155-chains.env';
	import EthWalletConnectSignModal from '$eth/components/wallet-connect/EthWalletConnectSignModal.svelte';
	import { modalWalletConnectSign } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import {walletConnectListenerStore} from "$lib/stores/wallet-connect.store";
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
</script>

{#if $modalWalletConnectSign && nonNullish(request)}
	{#if nonNullish(ethChainId)}
		<EthWalletConnectSignModal {listener} {request} />
	{:else if nonNullish(solChainId) && nonNullish(sourceSolNetwork)}
		<SolWalletConnectSignModal {listener} network={sourceSolNetwork} {request} />
	{/if}
{/if}
