<script lang="ts">
	import { Signer } from '@dfinity/oisy-wallet-signer/signer';
	import { isNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import SignerIdle from '$lib/components/signer/SignerIdle.svelte';
	import SignerSignIn from '$lib/components/signer/SignerSignIn.svelte';
	import { REPLICA_HOST } from '$lib/constants/app.constants';
	import { authNotSignedIn, authIdentity } from '$lib/derived/auth.derived';

	let signer: Signer | undefined | null;

	const reset = () => {
		signer?.disconnect();
		signer = null;
	};

	const init = async () => {
		if (isNullish($authIdentity)) {
			reset();
			return;
		}

		signer = Signer.init({
			owner: $authIdentity,
			host: REPLICA_HOST
		});
	};

	onDestroy(reset);

	$: $authIdentity, (async () => init())();

	let idle = true;
</script>

<article class="bg-white rounded-lg px-5 py-6">
	{#if $authNotSignedIn}
		<SignerSignIn />
	{:else if idle}
		<div in:fade>
			<SignerIdle />
		</div>
	{:else}
		Doing something
	{/if}
</article>
