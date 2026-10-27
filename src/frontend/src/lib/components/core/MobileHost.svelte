<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ethAddress } from '$lib/derived/address.derived';
	import { navigateMobileHost, setMobilePresentation } from '$lib/services/mobile-host.services';
	import { publishMobileAccount } from '$lib/services/mobile-runtime.services';
	import { mobileScreenStore } from '$lib/stores/mobile-host.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { blockingOverlayOpenStore } from '$lib/stores/ui.store';
	import { mobileRouteAllowed } from '$lib/utils/mobile-navigation.utils';

	// Compiled out of normal bundles. Native UI tests seed the same in-memory
	// store as component tests, without weakening signed canister verification.
	onMount(() => {
		if (import.meta.env.VITE_MOBILE_UI_TEST !== 'true') {
			return;
		}
		let disposed = false;
		let cleanup: (() => void) | undefined;
		void import('$tests/mocks/mobile-notes.fixture').then(({ installNotesFixture }) => {
			if (!disposed) {
				cleanup = installNotesFixture();
			}
		});
		return () => {
			disposed = true;
			cleanup?.();
		};
	});

	onMount(() =>
		mobileScreenStore.subscribe(async ({ screen }) => {
			modalStore.close();
			if (screen === 'contacts') {
				modalStore.openAddressBook({ id: Symbol() });
				return;
			}
			const path =
				screen === 'activity' || screen === 'earn' || screen === 'borrow' || screen === 'notes'
					? `/${screen}/`
					: screen === 'preferences'
						? '/settings/'
						: screen === 'search'
							? '/?search=true'
							: '/';
			if (`${page.url.pathname}${page.url.search}` !== path) {
				await goto(path);
			}
		})
	);

	onMount(() =>
		blockingOverlayOpenStore.subscribe((blocking) => {
			void setMobilePresentation(blocking).catch(() => {
				// Native resets presentation when an expired runtime is removed.
			});
		})
	);

	beforeNavigate(({ to, cancel }) => {
		if (to && to.url.protocol !== 'https:' && !mobileRouteAllowed(to.url)) {
			cancel();
		}
	});
	afterNavigate(() => {
		const root =
			page.url.pathname === '/activity/'
				? 'activity'
				: page.url.pathname === '/earn/'
					? 'earn'
					: page.url.pathname === '/notes/'
						? 'notes'
						: page.url.pathname === '/borrow/'
							? 'borrow'
							: page.url.searchParams.has('search')
								? 'search'
								: 'wallet';
		void navigateMobileHost(root);
	});
	$effect(() => {
		void publishMobileAccount($ethAddress ?? undefined).catch(() => {
			// Expiry/navigation teardown may finish before an address load. Native fails closed.
		});
	});
</script>

<div aria-hidden="true" data-mobile-host></div>

<style lang="scss">
	:global(html:has([data-mobile-host])) {
		--mobile-navigation-inset: calc(88px + env(safe-area-inset-bottom));
		scroll-padding-bottom: var(--mobile-navigation-inset);
		overscroll-behavior: none;
		scrollbar-gutter: auto;
		overflow-x: clip;
	}
	:global(body:has([data-mobile-host])) {
		padding: env(safe-area-inset-top) env(safe-area-inset-right) var(--mobile-navigation-inset)
			env(safe-area-inset-left);
		min-height: 100dvh;
		height: auto;
		overscroll-behavior: none;
	}
	/* A sheet owns the whole viewport, including the area under native navigation.
	   The host hides its controls for the overlay's entire mounted lifetime. */
	:global(body:has([data-mobile-host]) .modal > .wrapper.dialog) {
		top: auto;
		bottom: 0;
		width: 100%;
		max-width: 100%;
		min-height: 0;
		height: auto;
		max-height: calc(100% - env(safe-area-inset-top) - 12px);
		border-radius: 28px 28px 0 0;
		padding-bottom: env(safe-area-inset-bottom);
	}
	:global(body:has([data-mobile-host]) .modal > .wrapper > .header) {
		min-height: 64px;
		padding: 10px 20px;
		border-bottom: 0;
		gap: 8px;
	}
	:global(body:has([data-mobile-host]) .modal > .wrapper > .header h2) {
		font-size: 17px;
		line-height: 1.4;
		font-weight: 600;
	}
	:global(body:has([data-mobile-host]) .modal .header button) {
		min-width: 44px;
		min-height: 44px;
	}
	:global(body:has([data-mobile-host]) .modal .header [data-tid='close-modal']) {
		border-radius: 50%;
		background: var(--background-shade);
	}
	:global(body:has([data-mobile-host]) .modal .container-wrapper),
	:global(body:has([data-mobile-host]) .modal .container) {
		min-height: 0;
	}
	:global(body:has([data-mobile-host]) .modal .content .stretch),
	:global(body:has([data-mobile-host]) .modal .content:not(:has(.stretch))) {
		--dialog-padding-x: 20px;
		--dialog-padding-y: 16px;
	}
	:global(body:has([data-mobile-host]) .modal [data-modal-toolbar]) {
		padding-inline: 20px;
	}
	/* Remove only a redundant Close footer; keep Save, Cancel and other actions. */
	:global(
		body:has([data-mobile-host])
			.modal[data-dismissible='true']:has([data-tid='close-modal'])
			[data-modal-toolbar]:has(> [data-tid='modal-dismiss']:only-child)
	) {
		display: none;
	}
	:global(
		body:has([data-mobile-host]) .modal[data-mobile-presentation='fullScreen'] > .wrapper.dialog
	) {
		height: 100%;
		max-height: 100%;
		padding-top: env(safe-area-inset-top);
		border-radius: 0;
	}
	:global(body:has([data-mobile-host]) .bottom-sheet) {
		max-height: calc(100dvh - env(safe-area-inset-top) - 12px);
		border-radius: 28px 28px 0 0;
	}
</style>
