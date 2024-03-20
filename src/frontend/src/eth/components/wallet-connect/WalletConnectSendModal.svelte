<script lang="ts">
	import SendTokenContext from '$eth/components/send/SendTokenContext.svelte';
	import WalletConnectSendTokenModal from '$eth/components/wallet-connect/WalletConnectSendTokenModal.svelte';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import type {
		WalletConnectEthSendTransactionParams,
		WalletConnectListener
	} from '$eth/types/wallet-connect';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { Token } from '$lib/types/token';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { nonNullish } from '@dfinity/utils';

	export let request: Web3WalletTypes.SessionRequest;
	export let firstTransaction: WalletConnectEthSendTransactionParams;
	export let sourceNetwork: EthereumNetwork;
	export let listener: WalletConnectListener | undefined | null;

	let token: Token | undefined;
	$: token = $enabledEthereumTokens.find(
		({ network: { id: networkId } }) => networkId === sourceNetwork.id
	);
</script>

{#if nonNullish(token)}
	<SendTokenContext {token}>
		<WalletConnectSendTokenModal {request} {firstTransaction} {listener} {sourceNetwork} />
	</SendTokenContext>
{/if}
