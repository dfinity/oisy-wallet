<script lang="ts">
	import { Spinner, Toasts, SystemThemeListener } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { type Snippet, onMount, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import Banner from '$lib/components/core/Banner.svelte';
	import Busy from '$lib/components/ui/Busy.svelte';
	import ModalExitHandler from '$lib/components/ui/ModalExitHandler.svelte';
	import {
		TRACK_SYNC_AUTH_AUTHENTICATED_COUNT,
		TRACK_SYNC_AUTH_ERROR_COUNT,
		TRACK_SYNC_AUTH_NOT_AUTHENTICATED_COUNT
	} from '$lib/constants/analytics.contants';
	import { isLocked } from '$lib/derived/locked.derived';
	import { initPlausibleAnalytics, trackEvent } from '$lib/services/analytics.services';
	import { displayAndCleanLogoutMsg } from '$lib/services/auth.services';
	import { initAuthWorker } from '$lib/services/worker.auth.services';
	import { authStore, type AuthStoreData } from '$lib/stores/auth.store';
	import '$lib/styles/global.scss';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	/**
	 * Init dApp
	 */

	const init = async () => {
		/**
		 * We use `Promise.allSettled` to ensure that all initialization functions run,
		 * regardless of whether some of them fail. This avoids blocking the entire app
		 * if non-critical services like analytics or i18n fail to initialize.
		 *
		 * Each service handles its own error handling,
		 * and we avoid surfacing errors to the user here to keep the UX clean.
		 */
		await Promise.allSettled([syncAuthStore(), initPlausibleAnalytics(), i18n.init()]);
	};

	const syncAuthStore = async () => {
		if (!browser) {
			return;
		}

		try {
			await authStore.sync();

			// We are using $authStore.identity here and not the derived $authIdentity because we track the event imperatively right after authStore.sync
			trackEvent({
				name: nonNullish($authStore.identity)
					? TRACK_SYNC_AUTH_AUTHENTICATED_COUNT
					: TRACK_SYNC_AUTH_NOT_AUTHENTICATED_COUNT
			});
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_SYNC_AUTH_ERROR_COUNT
			});

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

	let worker = $state<
		| {
				syncAuthIdle: (args: { auth: AuthStoreData; locked?: boolean }) => void;
		  }
		| undefined
	>();

	onMount(async () => (worker = await initAuthWorker()));

	$effect(() => {
		[worker, $authStore, $isLocked];
		worker?.syncAuthIdle({ auth: $authStore, locked: $isLocked });
	});

	/**
	 * UI loader
	 */

	// To improve the UX while the app is loading on mainnet we display a spinner which is attached statically in the index.html files.
	// Once the authentication has been initialized we know most JavaScript resources has been loaded and therefore we can hide the spinner, the loading information.
	$effect(() => {
		if (!browser) {
			return;
		}

		// We want to display a spinner until the authentication is loaded. This to avoid a glitch when either the landing page or effective content (sign-in / sign-out) is presented.
		if ($authStore === undefined) {
			return;
		}

		const spinner = document.querySelector('body > #app-spinner');
		spinner?.remove();
	});
</script>

<svelte:window onstorage={syncAuthStore} />

{#await init()}
	<div in:fade>
		<Spinner />
	</div>
{:then _}
	{@render children()}
{/await}

<Banner />
<Toasts maxVisible={3} />
<Busy />
<ModalExitHandler />
<SystemThemeListener />
