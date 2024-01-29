<script lang="ts">
	import SendTokenContext from '$eth/components/send/SendTokenContext.svelte';
	import WalletConnectSendTokenModal from '$eth/components/wallet-connect/WalletConnectSendTokenModal.svelte';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import type {
		WalletConnectEthSendTransactionParams,
		WalletConnectListener
	} from '$eth/types/wallet-connect';

	export let request: Web3WalletTypes.SessionRequest;
	export let firstTransaction: WalletConnectEthSendTransactionParams;
	export let listener: WalletConnectListener | undefined | null;
</script>

<SendTokenContext>
	<WalletConnectSendTokenModal {request} {firstTransaction} {listener} />
</SendTokenContext>
