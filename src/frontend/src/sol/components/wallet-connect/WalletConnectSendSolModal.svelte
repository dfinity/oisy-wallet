<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import WalletConnectSendTokenModal from '$eth/components/wallet-connect/WalletConnectSendTokenModal.svelte';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { WalletConnectEthSendTransactionParams } from '$eth/types/wallet-connect';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import type { Token } from '$lib/types/token';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';

	export let request: Web3WalletTypes.SessionRequest;
	export let firstTransaction: WalletConnectEthSendTransactionParams;
	export let sourceNetwork: EthereumNetwork;
	export let listener: OptionWalletConnectListener;

	let token: Token | undefined;
	//TODO i don't think this is correct, also for eth
	$: token = $enabledSolanaTokens.find(
		({ network: { id: networkId } }) => networkId === sourceNetwork.id
	);
</script>

{#if nonNullish(token)}
	<SendTokenContext {token}>
		<!--		TODO change with SOL specific implementation?-->
		<WalletConnectSendTokenModal {request} {firstTransaction} {listener} {sourceNetwork} />
	</SendTokenContext>
{/if}
