<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onDestroy, setContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import SignerAccounts from '$lib/components/signer/SignerAccounts.svelte';
	import SignerIdle from '$lib/components/signer/SignerIdle.svelte';
	import SignerPermissions from '$lib/components/signer/SignerPermissions.svelte';
	import SignerSignIn from '$lib/components/signer/SignerSignIn.svelte';
	import { authNotSignedIn, authIdentity } from '$lib/derived/auth.derived';
	import { initSignerContext, SIGNER_CONTEXT_KEY } from '$lib/stores/signer.store';

	const { idle, reset, ...context } = initSignerContext();
	setContext(SIGNER_CONTEXT_KEY, { ...context, idle, reset });

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

<article class="bg-white rounded-lg px-5 py-6">
	{#if $authNotSignedIn}
		<SignerSignIn />
	{:else if $idle}
		<div in:fade>
			<SignerIdle />
		</div>
	{:else}
		<SignerPermissions />

		<SignerAccounts />
	{/if}
</article>
