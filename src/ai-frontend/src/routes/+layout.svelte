<script lang="ts">
	import { Spinner, SystemThemeListener, Toasts } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import Busy from '$lib/components/ui/Busy.svelte';
	import ResponsiveListener from '$lib/components/ui/ResponsiveListener.svelte';
	import {
		TRACK_SYNC_AUTH_AUTHENTICATED_COUNT,
		TRACK_SYNC_AUTH_ERROR_COUNT,
		TRACK_SYNC_AUTH_NOT_AUTHENTICATED_COUNT
	} from '$lib/constants/analytics.constants';
	import { initPlausibleAnalytics, trackEvent } from '$lib/services/analytics.services';
	import { displayAndCleanLogoutMsg } from '$lib/services/auth.services';
	import '$lib/styles/global.scss';
	import { authStore } from '$lib/stores/auth.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const init = async () => {
		await Promise.allSettled([syncAuthStore(), initPlausibleAnalytics(), i18n.init()]);
	};

	const syncAuthStore = async () => {
		if (!browser) {
			return;
		}

		try {
			await authStore.sync();

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

		await displayAndCleanLogoutMsg();
	};

	$effect(() => {
		if (!browser) {
			return;
		}

		if ($authStore === undefined) {
			return;
		}

		const spinner = document.querySelector('body > #app-spinner');

		if (nonNullish(spinner) && spinner instanceof HTMLElement) {
			spinner.style.animation = 'none';
			spinner.style.transition = 'none';

			requestAnimationFrame(() => {
				spinner.remove();
			});
		}
	});
</script>

<svelte:window onstorage={syncAuthStore} />

{#await init()}
	<div class="text-brand-primary" in:fade>
		<Spinner />
	</div>
{:then _}
	{@render children()}
{/await}

<Toasts maxVisible={3} />
<Busy />
<SystemThemeListener />
<ResponsiveListener />
