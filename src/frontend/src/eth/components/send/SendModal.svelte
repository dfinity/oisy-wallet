<script lang="ts">
	import SendTokenModal from '$eth/components/send/SendTokenModal.svelte';
	import SendTokenContext from '$eth/components/send/SendTokenContext.svelte';
</script>

<SendTokenContext>
	<SendTokenModal />
</SendTokenContext>
