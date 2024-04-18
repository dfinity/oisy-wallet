<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore, type AuthStoreData } from '$lib/stores/auth.store';
	import { onMount } from 'svelte';
	import { initAuthWorker } from '$lib/services/worker.auth.services';
	import { fade } from 'svelte/transition';
	import { Spinner, Toasts } from '@dfinity/gix-components';
	import Busy from '$lib/components/ui/Busy.svelte';

	import '$lib/styles/global.scss';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import SignIn from '$lib/components/pages/SignIn.svelte';
	import Banner from '$lib/components/core/Banner.svelte';
	import { displayAndCleanLogoutMsg } from '$lib/services/auth.services';
	import { toastsError } from '$lib/stores/toasts.store';
	import { initAnalytics, trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		TRACK_SYNC_AUTH_AUTHENTICATED_COUNT,
		TRACK_SYNC_AUTH_ERROR_COUNT,
		TRACK_SYNC_AUTH_NOT_AUTHENTICATED_COUNT
	} from '$lib/constants/analytics.contants';
	import { nonNullish } from '@dfinity/utils';

	/**
	 * Init dApp
	 */

	const init = async () => await Promise.all([syncAuthStore(), initAnalytics(), i18n.init()]);

	const syncAuthStore = async () => {
		if (!browser) {
			return;
		}

		try {
			await authStore.sync();

			await trackEvent({
				name: nonNullish($authStore.identity)
					? TRACK_SYNC_AUTH_AUTHENTICATED_COUNT
					: TRACK_SYNC_AUTH_NOT_AUTHENTICATED_COUNT
			});
		} catch (err: unknown) {
			await trackEvent({
				name: TRACK_SYNC_AUTH_ERROR_COUNT
			});

			toastsError({
				msg: { text: 'Unexpected issue while syncing the status of your authentication.' },
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
	{#if $authSignedIn}
		<slot />
	{:else}
		<SignIn />
	{/if}
{/await}

<Banner />
<Toasts />
<Busy />
