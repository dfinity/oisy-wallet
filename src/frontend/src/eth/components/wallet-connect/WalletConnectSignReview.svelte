<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import {
		getSignParamsMessageUtf8,
		getSignParamsMessageHex
	} from '$eth/utils/wallet-connect.utils';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Json from '$lib/components/ui/Json.svelte';
	import WalletConnectActions from '$lib/components/wallet-connect/WalletConnectActions.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		request: WalletKitTypes.SessionRequest;
		onApprove: () => void;
		onReject: () => void;
	}

	let { request, onApprove, onReject }: Props = $props();

	let message = $derived(getSignParamsMessageHex(request.params.request.params));

	let json = $state<unknown | undefined>();
	$effect(() => {
		try {
			json = JSON.parse(message);
		} catch (_err: unknown) {
			json = undefined;
		}
	});
</script>

<ContentWithToolbar>
	<p class="mb-0 font-bold">{$i18n.wallet_connect.text.method}:</p>
	<p class="mb-4 font-normal">
		{request.params.request.method}
	</p>

	<p class="mb-0.5 font-bold">{$i18n.wallet_connect.text.message}:</p>
	{#if nonNullish(json)}
		<div class="rounded-xs mt-4 bg-disabled p-4">
			<Json _collapsed={true} {json} />
		</div>
	{:else}
		<p class="mb-4 font-normal">
			<output class="break-all">{getSignParamsMessageUtf8(request.params.request.params)}</output>
		</p>
	{/if}

	{#snippet toolbar()}
		<WalletConnectActions {onApprove} {onReject} />
	{/snippet}
</ContentWithToolbar>
