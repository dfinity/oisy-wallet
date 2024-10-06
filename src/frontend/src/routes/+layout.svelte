<script lang="ts">
	import { Spinner, Toasts } from '@dfinity/gix-components';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import Banner from '$lib/components/core/Banner.svelte';
	import Busy from '$lib/components/ui/Busy.svelte';
	import { displayAndCleanLogoutMsg } from '$lib/services/auth.services';
	import { initAuthWorker } from '$lib/services/worker.auth.services';
	import { authStore, type AuthStoreData } from '$lib/stores/auth.store';
	import '$lib/styles/global.scss';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';

	/**
	 * Init dApp
	 */

	const init = async () => await Promise.all([syncAuthStore(), i18n.init()]);

	const syncAuthStore = async () => {
		if (!browser) {
			return;
		}

		try {
			await authStore.sync();
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.auth.error.unexpected_issue_with_syncing },
				err
			});
		}

		displayAndCleanLogoutMsg();
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
	<slot />
{/await}

<Banner />
<Toasts maxVisible={3} />
<Busy />
