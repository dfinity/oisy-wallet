<script lang="ts">
	import { onMount } from 'svelte';
	import ExtensionLoaders from '$lib/components/extension/ExtensionLoaders.svelte';
	import ExtensionPanelContent from '$lib/components/extension/ExtensionPanelContent.svelte';
	import SignerSignIn from '$lib/components/signer/SignerSignIn.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { announcePanelReady } from '$lib/providers/extension.providers';

	onMount(announcePanelReady);
</script>

{#if $authNotSignedIn}
	<SignerSignIn />
{:else}
	<ExtensionLoaders>
		<ExtensionPanelContent />
	</ExtensionLoaders>
{/if}
