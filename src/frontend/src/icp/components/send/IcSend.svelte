<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalIcSend } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';

	const openSend = async () => {
		// TODO: load ckBTC and ckETH minter min withdrawal and fee
		modalStore.openIcSend();
	};
</script>

<button
	class="hero"
	on:click={async () => await openSend()}
	disabled={$isBusy}
	class:opacity-50={$isBusy}
>
	<IconSend size="28" />
	<span>Send</span></button
>

{#if $modalIcSend}
	<IcSendModal />
{/if}
