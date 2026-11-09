<script lang="ts">
	import ExtensionLoaders from '$lib/components/extension/ExtensionLoaders.svelte';
	import ExtensionRequest from '$lib/components/extension/ExtensionRequest.svelte';
	import ExtensionSignIn from '$lib/components/extension/ExtensionSignIn.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
</script>

{#if $authNotSignedIn}
	<ExtensionSignIn />
{:else}
	<ExtensionLoaders>
		<ExtensionRequest />
	</ExtensionLoaders>
{/if}
