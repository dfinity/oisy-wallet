<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onDestroy, setContext } from 'svelte';
	import SignerAccounts from '$lib/components/signer/SignerAccounts.svelte';
	import SignerCallCanister from '$lib/components/signer/SignerCallCanister.svelte';
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
			<SignerCallCanister />
		</SignerAccounts>
	{/if}
</article>
