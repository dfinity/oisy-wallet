<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalIcpSend, modalSend } from '$lib/derived/modal.derived';
	import SendModal from '$lib/components/send/SendModal.svelte';
	import IcpSendModal from '$lib/components/send/icp/IcpSendModal.svelte';
	import { tokenStandard } from '$lib/derived/token.derived';

	let disabled: boolean;
	$: disabled = $addressNotLoaded || $isBusy;

	const onClick = () => {
		if ($tokenStandard === 'icp') {
			modalStore.openIcpSend();
			return;
		}

		modalStore.openSend();
	};
</script>

<button class="flex-1 hero" on:click={onClick} {disabled} class:opacity-50={disabled}>
	<IconSend size="28" />
	<span>Send</span></button
>

{#if $modalSend}
	<SendModal />
{:else if $modalIcpSend}
	<IcpSendModal />
{/if}
