<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
</script>

<svelte:window on:popstate={modalStore.close} />
