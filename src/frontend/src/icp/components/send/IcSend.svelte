<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalIcSend } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { ICP_NETWORK_ID } from '$lib/constants/networks.constants';
</script>

<button class="hero" on:click={modalStore.openIcSend} disabled={$isBusy} class:opacity-50={$isBusy}>
	<IconSend size="28" />
	<span>Send</span></button
>

{#if $modalIcSend}
	<IcSendModal networkId={ICP_NETWORK_ID} />
{/if}
