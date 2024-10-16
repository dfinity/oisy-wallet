<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onDestroy, setContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import SignerAccounts from '$lib/components/signer/SignerAccounts.svelte';
	import SignerCallCanister from '$lib/components/signer/SignerCallCanister.svelte';
	import SignerConsentMessage from '$lib/components/signer/SignerConsentMessage.svelte';
	import SignerIdle from '$lib/components/signer/SignerIdle.svelte';
	import SignerPermissions from '$lib/components/signer/SignerPermissions.svelte';
	import SignerSignIn from '$lib/components/signer/SignerSignIn.svelte';
	import { authNotSignedIn, authIdentity } from '$lib/derived/auth.derived';
	import { initSignerContext, SIGNER_CONTEXT_KEY } from '$lib/stores/signer.store';

	// TODO: display messages on notifyErrors with toasts

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
				<SignerPermissions />

				<SignerConsentMessage />

				<SignerCallCanister />
			{/if}
		</SignerAccounts>
	{/if}
</article>
