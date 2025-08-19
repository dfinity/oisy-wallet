<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { EIP155_CHAINS } from '$env/eip155-chains.env';
	import WalletConnectSendModal from '$eth/components/wallet-connect/WalletConnectSendModal.svelte';
	import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { WalletConnectEthSendTransactionParams } from '$eth/types/wallet-connect';
	import { enabledEvmNetworks } from '$evm/derived/networks.derived';
	import { modalWalletConnectSend } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';

	export let listener: OptionWalletConnectListener;

	let request: WalletKitTypes.SessionRequest | undefined;
	$: request = $modalWalletConnectSend
		? ($modalStore?.data as WalletKitTypes.SessionRequest | undefined)
		: undefined;

	let firstTransaction: WalletConnectEthSendTransactionParams | undefined;
	$: firstTransaction = request?.params.request.params?.[0];

	let chainId: number | undefined;
	$: chainId = nonNullish(request?.params.chainId)
		? EIP155_CHAINS[request.params.chainId]?.chainId
		: undefined;

	let sourceNetwork: EthereumNetwork | undefined;
	$: sourceNetwork = nonNullish(chainId)
		? [...$enabledEthereumNetworks, ...$enabledEvmNetworks].find(
				({ chainId: cId }) => cId === BigInt(chainId)
			)
		: undefined;
</script>

{#if $modalWalletConnectSend && nonNullish(request) && nonNullish(firstTransaction) && nonNullish(sourceNetwork)}
	<WalletConnectSendModal {firstTransaction} {request} {sourceNetwork} bind:listener />
{/if}
