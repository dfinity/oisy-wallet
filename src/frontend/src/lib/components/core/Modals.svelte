<script lang="ts">
	import { modalHideToken, modalIcHideToken } from '$lib/derived/modal.derived';
	import IcHideTokenModal from '$icp/components/tokens/IcHideTokenModal.svelte';
	import HideTokenModal from '$eth/components/tokens/HideTokenModal.svelte';

	/**
	 * Modals that must be declared at the root of the layout if they are used across routes - available on navigation.
	 */
</script>

{#if $modalHideToken}
	<HideTokenModal />
{:else if $modalIcHideToken}
	<IcHideTokenModal />
{/if}
