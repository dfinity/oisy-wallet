<script lang="ts">
	import ExtensionLoaders from '$lib/components/extension/ExtensionLoaders.svelte';
	import ExtensionRequest from '$lib/components/extension/ExtensionRequest.svelte';
	import SignerSignIn from '$lib/components/signer/SignerSignIn.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
</script>

{#if $authNotSignedIn}
	<SignerSignIn />
{:else}
	<ExtensionLoaders>
		<ExtensionRequest />
	</ExtensionLoaders>
{/if}
