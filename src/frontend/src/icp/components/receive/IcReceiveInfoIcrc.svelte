<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import IcReceiveWalletAddress from '$icp/components/receive/IcReceiveWalletAddress.svelte';
	import { getContext } from 'svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';

	const { close } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);
</script>

<div class="stretch">
	<IcReceiveWalletAddress on:icQRCode />
</div>

<button class="primary full center text-center" on:click={close}>{$i18n.core.text.done}</button>
