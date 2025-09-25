<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { EIP155_CHAINS } from '$env/eip155-chains.env';
	import EthWalletConnectSendModal from '$eth/components/wallet-connect/EthWalletConnectSendModal.svelte';
	import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
	import { enabledEvmNetworks } from '$evm/derived/networks.derived';
	import { modalWalletConnectSend } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';

	interface Props {
		listener: OptionWalletConnectListener;
	}

	let { listener = $bindable() }: Props = $props();

	let request = $derived(
		$modalWalletConnectSend
			? ($modalStore?.data as WalletKitTypes.SessionRequest | undefined)
			: undefined
	);

	let firstTransaction = $derived(request?.params.request.params?.[0]);

	let chainId = $derived(
		nonNullish(request?.params.chainId) ? EIP155_CHAINS[request.params.chainId]?.chainId : undefined
	);

	let sourceNetwork = $derived(
		nonNullish(chainId)
			? [...$enabledEthereumNetworks, ...$enabledEvmNetworks].find(
					({ chainId: cId }) => cId === BigInt(chainId)
				)
			: undefined
	);
</script>

{#if $modalWalletConnectSend && nonNullish(request) && nonNullish(firstTransaction) && nonNullish(sourceNetwork)}
	<EthWalletConnectSendModal {firstTransaction} {request} {sourceNetwork} bind:listener />
{/if}
