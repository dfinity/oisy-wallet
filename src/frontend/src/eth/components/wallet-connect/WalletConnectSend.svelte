<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { CAIP10_CHAINS } from '$env/caip10-chains.env';
	import { EIP155_CHAINS } from '$env/eip155-chains.env';
	import WalletConnectSendModal from '$eth/components/wallet-connect/WalletConnectSendModal.svelte';
	import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { WalletConnectEthSendTransactionParams } from '$eth/types/wallet-connect';
	import { modalWalletConnectSend } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import { mapChainIdToNetwork } from '$lib/utils/wallet-connect.utils';
	import WalletConnectSendSolModal from '$sol/components/wallet-connect/WalletConnectSendSolModal.svelte';
	import { enabledSolanaNetworks } from '$sol/derived/networks.derived';
	import type { SolanaNetwork } from '$sol/types/network';

	export let listener: OptionWalletConnectListener;

	let request: Web3WalletTypes.SessionRequest | undefined;
	$: request = $modalWalletConnectSend
		? ($modalStore?.data as Web3WalletTypes.SessionRequest | undefined)
		: undefined;

	let firstTransaction: WalletConnectEthSendTransactionParams | undefined;
	$: firstTransaction = request?.params.request.params?.[0];

	let requestNetwork;
	$: requestNetwork = nonNullish(request) && mapChainIdToNetwork(request.params.chainId);

	let chainId: number | string | undefined;
	$: {
		if (isNullish(request) || isNullish(requestNetwork)) {
			chainId = undefined;
			return;
		}

		if (requestNetwork === 'ethereum') {
			chainId = EIP155_CHAINS[request.params.chainId]?.chainId;
		} else if (requestNetwork === 'solana') {
			chainId = CAIP10_CHAINS[request.params.chainId]?.chainId;
		}
	}

	let sourceEthNetwork: EthereumNetwork | undefined;
	$: sourceEthNetwork =
		nonNullish(chainId) && requestNetwork === 'ethereum'
			? $enabledEthereumNetworks.find(({ chainId: cId }) => cId === BigInt(chainId as number))
			: undefined;

	let sourceSolNetwork: SolanaNetwork | undefined;
	$: sourceSolNetwork =
		nonNullish(chainId) && requestNetwork === 'solana'
			? $enabledSolanaNetworks.find(({ chainId: cId }) => cId === chainId)
			: undefined;
</script>

{#if $modalWalletConnectSend && nonNullish(request) && nonNullish(firstTransaction) && nonNullish(sourceEthNetwork)}
	{#if requestNetwork === 'ethereum'}
		<WalletConnectSendModal
			{request}
			{firstTransaction}
			sourceNetwork={sourceEthNetwork}
			bind:listener
		/>
	{:else if requestNetwork === 'solana' && sourceEthNetwork}
		<WalletConnectSendSolModal
			{request}
			{firstTransaction}
			sourceNetwork={sourceEthNetwork}
			bind:listener
		/>
	{/if}
{/if}
