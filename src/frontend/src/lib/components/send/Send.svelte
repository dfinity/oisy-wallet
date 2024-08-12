<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { modalSend } from '$lib/derived/modal.derived';
	import SendModal from '$lib/components/send/SendModal.svelte';
	import SendButtonWithModal from '$lib/components/send/SendButtonWithModal.svelte';
</script>

<SendButtonWithModal open={modalStore.openSend} isOpen={$modalSend}>
	<SendModal on:nnsClose slot="modal" />
</SendButtonWithModal>
