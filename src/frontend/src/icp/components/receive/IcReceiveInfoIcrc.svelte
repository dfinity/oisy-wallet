<script lang="ts">
	import { getContext } from 'svelte';
	import IcReceiveWalletAddress from '$icp/components/receive/IcReceiveWalletAddress.svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	const { close } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);
</script>

<ContentWithToolbar>
	<IcReceiveWalletAddress on:icQRCode />

	<Button fullWidth on:click={close} slot="toolbar">{$i18n.core.text.done}</Button>
</ContentWithToolbar>
