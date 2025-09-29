<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import {
		getSignParamsMessageUtf8,
		getSignParamsMessageTypedDataV4
	} from '$eth/utils/wallet-connect.utils';
	import Json from '$lib/components/ui/Json.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		request: WalletKitTypes.SessionRequest;
	}

	let { request }: Props = $props();

	let json = $derived.by(() => {
		try {
			return getSignParamsMessageTypedDataV4(request.params.request.params);
		} catch (_: unknown) {
			return undefined;
		}
	});
</script>

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
