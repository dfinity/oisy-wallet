<script lang="ts">
	import { modalIcAddToken } from '$lib/derived/modal.derived.js';
	import AddToken from '$lib/components/tokens/AddToken.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import IcAddTokenModal from '$icp/components/tokens/IcAddTokenModal.svelte';
</script>

<AddToken on:click={modalStore.openIcAddToken} />

{#if $modalIcAddToken}
	<IcAddTokenModal />
{/if}
