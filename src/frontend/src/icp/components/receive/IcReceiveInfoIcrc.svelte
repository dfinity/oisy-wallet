<script lang="ts">
	import { getContext } from 'svelte';
	import IcReceiveWalletAddress from '$icp/components/receive/IcReceiveWalletAddress.svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import ContentWithButtons from '$lib/components/ui/ContentWithButtons.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	const { close } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);
</script>

<ContentWithButtons>
	<IcReceiveWalletAddress on:icQRCode />

	<button class="primary full center text-center" on:click={close} slot="buttons"
		>{$i18n.core.text.done}</button
	>
</ContentWithButtons>
