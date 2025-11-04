<script lang="ts">
	import { Spinner, SystemThemeListener, Toasts } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import Banner from '$lib/components/core/Banner.svelte';
	import Busy from '$lib/components/ui/Busy.svelte';
	import ModalExitHandler from '$lib/components/ui/ModalExitHandler.svelte';
	import ResponsiveListener from '$lib/components/ui/ResponsiveListener.svelte';
	import {
		TRACK_SYNC_AUTH_AUTHENTICATED_COUNT,
		TRACK_SYNC_AUTH_ERROR_COUNT,
		TRACK_SYNC_AUTH_NOT_AUTHENTICATED_COUNT
	} from '$lib/constants/analytics.constants';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { isLocked } from '$lib/derived/locked.derived';
	import { initPlausibleAnalytics, trackEvent } from '$lib/services/analytics.services';
	import { AuthBroadcastChannel } from '$lib/services/auth-broadcast.services';
	import { displayAndCleanLogoutMsg } from '$lib/services/auth.services';
	import { AuthWorker } from '$lib/services/worker.auth.services';
	import { authStore } from '$lib/stores/auth.store';
	import '$lib/styles/global.scss';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { isIos } from '$lib/utils/device.utils';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	/**
	 * Init dApp
	 */

	const init = async () => {
		/**
		 * We use `Promise.allSettled` to ensure that all initialisation functions run,
		 * regardless of whether some of them fail. This avoids blocking the entire app
		 * if non-critical services like analytics or i18n fail to initialise.
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

	let worker = $state<AuthWorker | undefined>();

	onMount(async () => (worker = await AuthWorker.init()));
	onDestroy(() => worker?.destroy());

	$effect(() => {
		[worker, $authStore, $isLocked];
		worker?.syncAuthIdle({ auth: $authStore, locked: $isLocked });
	});

	/**
	 * UI loader
	 */

	// To improve the UX while the app is loading on mainnet we display a spinner which is attached statically in the index.html files.
	// Once the authentication has been initialised, we know most JavaScript resources have been loaded, and therefore we can hide the spinner, the loading information.
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

	const handleBroadcastLoginSuccess = async () => {
		const wasPreviouslyAuthenticated = $authSignedIn;

		await authStore.forceSync();

		if ($authNotSignedIn) {
			return;
		}

		if (!wasPreviouslyAuthenticated) {
			toastsShow({
				text: $i18n.auth.message.refreshed_authentication,
				level: 'success'
			});
		}

		// TODO: add a warning banner for the hedge case in which the tab was already logged in and now is refreshed with another identity
	};

	const openBc = () => {
		try {
			const bc = new AuthBroadcastChannel();

			bc.onLoginSuccess(handleBroadcastLoginSuccess);

			return () => {
				bc?.close();
			};
		} catch (err: unknown) {
			// We don't really care if the broadcast channel fails to open or if it fails to set the message handler.
			// This is a non-critical feature that improves the UX when OISY is open in multiple tabs.
			// We just print a warning in the console for debugging purposes.
			console.warn('Auth BroadcastChannel initialization failed', err);
		}
	};

	onMount(openBc);

	onMount(() => {
		const toggle = (e) => {
			console.log('toggle', e.target);
		};

		document.addEventListener('touchstart', toggle);
		document.addEventListener('touchend', toggle);

		document.addEventListener(
			'touchmove',
			(e) => {
				e.target instanceof Element && e.target.classList.add('touch');
				const modal = document.querySelector('.modal');
				if (nonNullish(modal) && e.target instanceof Element && !modal.contains(e.target)) {
					e.preventDefault();
				}
			},
			{ passive: false }
		);
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
<ResponsiveListener />
