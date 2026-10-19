<script lang="ts">
	import { onMount } from 'svelte';
	import ExtensionLoaders from '$lib/components/extension/ExtensionLoaders.svelte';
	import ExtensionPanelContent from '$lib/components/extension/ExtensionPanelContent.svelte';
	import ExtensionSignIn from '$lib/components/extension/ExtensionSignIn.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { announcePanelReady } from '$lib/providers/extension.providers';

	onMount(announcePanelReady);
</script>

{#if $authNotSignedIn}
	<div class="flex justify-center"><OisyWalletLogo /></div>

	<ExtensionSignIn />
{:else}
	<ExtensionLoaders>
		<ExtensionPanelContent />
	</ExtensionLoaders>
{/if}
