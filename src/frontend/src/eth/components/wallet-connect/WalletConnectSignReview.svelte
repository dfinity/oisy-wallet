<script lang="ts">
	import {
		getSignParamsMessageUtf8,
		getSignParamsMessageHex
	} from '$eth/utils/wallet-connect.utils';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import WalletConnectActions from './WalletConnectActions.svelte';
	import { nonNullish } from '@dfinity/utils';
	import Json from '$lib/components/ui/Json.svelte';
	import { i18n } from '$lib/stores/i18n.store';

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

<div class="stretch">
	<p class="font-bold">{$i18n.wallet_connect.text.method}</p>
	<p class="mb-4 font-normal">
		{request.params.request.method}
	</p>

	<p class="font-bold">{$i18n.wallet_connect.text.message}</p>
	{#if nonNullish(json)}
		<div class="bg-dust rounded-sm p-4 mt-4">
			<Json {json} _collapsed={true} />
		</div>
	{:else}
		<p class="mb-4 font-normal">
			<output class="break-all">{getSignParamsMessageUtf8(request.params.request.params)}</output>
		</p>
	{/if}
</div>

<WalletConnectActions on:icApprove on:icReject />
