<script lang="ts">
	import HideTokenModal from '$eth/components/tokens/HideTokenModal.svelte';
	import IcHideTokenModal from '$icp/components/tokens/IcHideTokenModal.svelte';
	import AirdropModalDetails from '$lib/components/airdrops/AirdropModalDetails.svelte';
	import DappModalDetails from '$lib/components/dapps/DappModalDetails.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import {
		modalDAppDetails,
		modalHideToken,
		modalIcHideToken,
		modalAirdropDetails
	} from '$lib/derived/modal.derived';

	/**
	 * Modals that must be declared at the root of the layout if they are used across routes - available on navigation.
	 */
</script>

{#if $authSignedIn}
	{#if $modalHideToken}
		<HideTokenModal />
	{:else if $modalIcHideToken}
		<IcHideTokenModal />
	{:else if $modalDAppDetails}
		<DappModalDetails />
	{:else if $modalAirdropDetails}
		<AirdropModalDetails />
	{/if}
{/if}
