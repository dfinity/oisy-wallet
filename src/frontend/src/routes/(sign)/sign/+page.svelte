<script lang="ts">
	import SignerSignIn from '$lib/components/signer/SignerSignIn.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
</script>

<article class="mb-10 flex min-h-96 flex-col rounded-lg border border-water bg-white px-5 py-6">
	{#if $authNotSignedIn}
		<SignerSignIn />
	{:else}
		<p>Work in progress. Click the OISY Wallet logo above to go back to wallet.</p>
	{/if}
</article>
