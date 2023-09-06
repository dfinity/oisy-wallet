<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore, type AuthStoreData } from '$lib/stores/auth.store';
	import { onMount } from 'svelte';
	import { initAuthWorker } from '$lib/services/worker.auth.services';
	import { fade } from 'svelte/transition';
	import { Spinner, Toasts } from '@dfinity/gix-components';
	import Busy from '$lib/components/ui/Busy.svelte';

	import '$lib/styles/global.scss';
	import { authSignedInStore } from '$lib/derived/auth.derived';
	import SignIn from '$lib/components/pages/SignIn.svelte';

	/**
	 * Init authentication
	 */

	const init = async () => await Promise.all([syncAuthStore()]);

	const syncAuthStore = async () => {
		if (!browser) {
			return;
		}

		try {
			await authStore.sync();
		} catch (err: unknown) {
			console.error(err);
		}
	};

	/**
	 * Workers
	 */

	let worker: { syncAuthIdle: (auth: AuthStoreData) => void } | undefined;

	onMount(async () => (worker = await initAuthWorker()));

	$: worker, $authStore, (() => worker?.syncAuthIdle($authStore))();
</script>

<svelte:window on:storage={syncAuthStore} />

{#await init()}
	<div in:fade>
		<Spinner />
	</div>
{:then _}
	{#if $authSignedInStore}
		<slot />
	{:else}
		<SignIn />
	{/if}
{/await}

<Toasts />
<Busy />
