<script lang="ts">
	import { getSignParamsMessage } from '$lib/utils/wallet-connect.utils';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';

	export let request: Web3WalletTypes.SessionRequest;
</script>

<p class="font-bold">Message</p>
<p class="mb-2 font-normal">
	<output class="break-words">{getSignParamsMessage(request.params.request.params)}</output>
</p>

<p class="font-bold">Method</p>
<p class="mb-2 font-normal">
	{request.params.request.method}
</p>

<WalletConnectActions on:icApprove on:icReject />
