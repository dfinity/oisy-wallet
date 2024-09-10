<script lang="ts">
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import SignerSignIn from '$lib/components/signer/SignerSignIn.svelte';
</script>

<article class="bg-white rounded-lg px-5 py-6">
	{#if $authNotSignedIn}
		<SignerSignIn />
	{:else}
		TODO: Awaiting connection...
	{/if}
</article>
