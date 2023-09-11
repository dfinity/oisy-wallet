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
	import Banner from '$lib/components/core/Banner.svelte';

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

	/**
	 * UI loader
	 */

	// To improve the UX while the app is loading on mainnet we display a spinner which is attached statically in the index.html files.
	// Once the authentication has been initialized we know most JavaScript resources has been loaded and therefore we can hide the spinner, the loading information.
	$: (() => {
		if (!browser) {
			return;
		}

		// We want to display a spinner until the authentication is loaded. This to avoid a glitch when either the landing page or effective content (sign-in / sign-out) is presented.
		if ($authStore === undefined) {
			return;
		}

		const spinner = document.querySelector('body > #app-spinner');
		spinner?.remove();
	})();
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

<Banner />
<Toasts />
<Busy />
