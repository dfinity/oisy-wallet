<script lang="ts">
	import {
		getSignParamsMessageUtf8,
		getSignParamsMessageHex
	} from '$lib/utils/wallet-connect.utils';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import { nonNullish } from '@dfinity/utils';
	import Json from '$lib/components/ui/Json.svelte';

	export let request: Web3WalletTypes.SessionRequest;

	let message: string;
	$: message = getSignParamsMessageHex(request.params.request.params);

	let json: unknown | undefined;
	$: (() => {
		try {
			json = JSON.parse(message);
		} catch (_err: unknown) {
			json = undefined;
		}
	})();
</script>

<p class="font-bold">Method</p>
<p class="mb-2 font-normal">
	{request.params.request.method}
</p>

<p class="font-bold">Message</p>
{#if nonNullish(json)}
	<div class="bg-blue text-off-white rounded-sm p-2 mt-1">
		<Json {json} _collapsed={true} />
	</div>
{:else}
	<p class="mb-2 font-normal">
		<output class="break-words">{getSignParamsMessageUtf8(request.params.request.params)}</output>
	</p>
{/if}

<WalletConnectActions on:icApprove on:icReject />
