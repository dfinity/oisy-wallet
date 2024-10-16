<script lang="ts">
	import SignerAccounts from '$lib/components/signer/SignerAccounts.svelte';
	import SignerPermissions from '$lib/components/signer/SignerPermissions.svelte';
	import SignerSignIn from '$lib/components/signer/SignerSignIn.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { initSignerContext } from '$lib/stores/signer.store';

	const { idle } = initSignerContext();
</script>

<article class="mb-10 flex min-h-96 flex-col rounded-lg border border-water bg-white px-5 py-6">
	{#if $authNotSignedIn}
		<SignerSignIn />
	{:else}
		<SignerAccounts>
			{#if $idle}
				<p>Work in progress. Click the OISY Wallet logo above to go back to wallet.</p>
			{:else}
				<SignerPermissions />
			{/if}
		</SignerAccounts>
	{/if}
</article>
