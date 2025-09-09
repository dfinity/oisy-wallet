<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import WalletConnectSendTokenModal from '$eth/components/wallet-connect/WalletConnectSendTokenModal.svelte';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { WalletConnectEthSendTransactionParams } from '$eth/types/wallet-connect';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import type { Token } from '$lib/types/token';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';

	interface Props {
		request: WalletKitTypes.SessionRequest;
		firstTransaction: WalletConnectEthSendTransactionParams;
		sourceNetwork: EthereumNetwork;
		listener: OptionWalletConnectListener;
	}

	let { request, firstTransaction, sourceNetwork, listener }: Props = $props();

	let token: Token | undefined = $derived(
		[...$enabledEthereumTokens, ...$enabledEvmTokens].find(
			({ network: { id: networkId } }) => networkId === sourceNetwork.id
		)
	);
</script>

{#if nonNullish(token)}
	<SendTokenContext {token}>
		<WalletConnectSendTokenModal {firstTransaction} {listener} {request} {sourceNetwork} />
	</SendTokenContext>
{/if}
