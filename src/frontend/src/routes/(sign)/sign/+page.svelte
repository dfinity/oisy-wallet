<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onDestroy, setContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import SignerAccounts from '$lib/components/signer/SignerAccounts.svelte';
	import SignerConsentMessage from '$lib/components/signer/SignerConsentMessage.svelte';
	import SignerIdle from '$lib/components/signer/SignerIdle.svelte';
	import SignerSignIn from '$lib/components/signer/SignerSignIn.svelte';
	import { authNotSignedIn, authIdentity } from '$lib/derived/auth.derived';
	import { initSignerContext, SIGNER_CONTEXT_KEY } from '$lib/stores/signer.store';

	const { idle, reset, ...context } = initSignerContext();
	setContext(SIGNER_CONTEXT_KEY, {
		...context,
		idle,
		reset
	});

	const init = () => {
		if (isNullish($authIdentity)) {
			reset();
			return;
		}

		context.init({ owner: $authIdentity });
	};

	onDestroy(reset);

	$: $authIdentity, init();
</script>

<article class="mb-10 flex min-h-96 flex-col rounded-lg border border-water bg-white px-5 py-6">
	{#if $authNotSignedIn}
		<SignerSignIn />
	{:else}
		<SignerAccounts>
			{#if $idle}
				<div in:fade={{ delay: 150, duration: 250 }}>
					<SignerIdle />
				</div>
			{:else}
				<SignerConsentMessage />

				<p>Work in progress. Click the OISY Wallet logo above to go back to wallet.</p>
			{/if}
		</SignerAccounts>
	{/if}
</article>
