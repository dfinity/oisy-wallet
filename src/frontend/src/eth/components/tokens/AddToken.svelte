<script lang="ts">
	import { modalAddToken } from '$lib/derived/modal.derived.js';
	import AddTokenModal from '$eth/components/tokens/AddTokenModal.svelte';
	import AddToken from '$lib/components/tokens/AddToken.svelte';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<AddToken on:click={modalStore.openAddToken} />

{#if $modalAddToken}
	<AddTokenModal />
{/if}
