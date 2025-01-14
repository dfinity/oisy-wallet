<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import WalletConnectSendTokenModal from '$sol/components/wallet-connect/WalletConnectSendTokenModal.svelte';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import type { Token } from '$lib/types/token';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import type { SolanaNetwork } from '$sol/types/network';
	import type { WalletConnectSolSendTransactionParams } from '$sol/types/wallet-connect';

	export let request: Web3WalletTypes.SessionRequest;
	export let firstTransaction: WalletConnectSolSendTransactionParams;
	export let sourceNetwork: SolanaNetwork;
	export let listener: OptionWalletConnectListener;

	let token: Token | undefined;
	$: token = $enabledSolanaTokens.find(
		({ network: { id: networkId } }) => networkId === sourceNetwork.id
	);
</script>

{#if nonNullish(token)}
	<SendTokenContext {token}>
		<WalletConnectSendTokenModal {request} {firstTransaction} {listener} {sourceNetwork} />
	</SendTokenContext>
{/if}
