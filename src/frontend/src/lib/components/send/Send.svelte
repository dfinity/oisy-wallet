<script lang="ts">
	import SendButtonWithModal from '$lib/components/send/SendButtonWithModal.svelte';
	import SendModal from '$lib/components/send/SendModal.svelte';
	import { modalSend } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<SendButtonWithModal open={modalStore.openSend} isOpen={$modalSend}>
	<SendModal on:nnsClose slot="modal" />
</SendButtonWithModal>
