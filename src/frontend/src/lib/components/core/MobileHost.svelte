<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { afterNavigate, beforeNavigate, onNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ethAddress } from '$lib/derived/address.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import {
		publishMobileNavigation,
		connectMobileInteractions,
		clearMobileBack,
		prepareMobileBack,
		finishMobileRefresh,
		setMobilePresentation
	} from '$lib/services/mobile-host.services';
	import { publishMobileAccount } from '$lib/services/mobile-runtime.services';
	import { cancelWalletRefresh, refreshWallet } from '$lib/services/wallet-refresh.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { mobileScreenStore, mobileBackStore } from '$lib/stores/mobile-host.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { blockingOverlayOpenStore } from '$lib/stores/ui.store';
	import { createMobileHistory } from '$lib/utils/mobile-history.utils';
	import { mobileRouteAllowed } from '$lib/utils/mobile-navigation.utils';

	// Compiled out of normal bundles. Native UI tests seed the same in-memory
	// store as component tests, without weakening signed canister verification.
	onMount(() => {
		if (import.meta.env.VITE_MOBILE_UI_TEST !== 'true') {
			return;
		}
		let disposed = false;
		let cleanup: (() => void) | undefined;
		void Promise.all([
			import('$tests/mocks/mobile-notes.fixture'),
			import('$tests/mocks/mobile-navigation.fixture')
		]).then(([{ installNotesFixture }, { installNavigationFixture }]) => {
			if (!disposed) {
				const removeNotes = installNotesFixture();
				const removeNavigation = installNavigationFixture();
				cleanup = () => {
					removeNotes();
					removeNavigation();
				};
			}
		});
		return () => {
			disposed = true;
			cleanup?.();
		};
	});

	// The router owns feature state; native only mirrors committed navigation.
	const navigation = createMobileHistory(page.url);
	let revision = 0;
	let renderRevision = 0;
	let listScroll: { path: string; x: number; y: number } | undefined;
	const publishNavigation = () => {
		const { root, requestId, backPath } = navigation.state;
		void publishMobileNavigation({
			root,
			requestId,
			revision: ++revision,
			...(backPath ? { backPath } : {})
		}).catch(() => {
			/* A superseded request or expired runtime is rejected by native. */
		});
	};

	onMount(() =>
		mobileScreenStore.subscribe(async (request) => {
			const transition = navigation.prepareRoot(request);
			if (!transition) {
				return;
			}
			if ($blockingOverlayOpenStore) {
				navigation.cancel(transition);
				publishNavigation();
				return;
			}
			if (request.screen === 'contacts') {
				navigation.cancel(transition);
				modalStore.openAddressBook({ id: Symbol() });
				publishNavigation();
				return;
			}
			try {
				if (`${page.url.pathname}${page.url.search}` !== transition.path) {
					await goto(transition.path, { replaceState: true });
				}
				// Same-path requests do not trigger afterNavigate. A cancelled navigation
				// acknowledges its request with the previous committed location.
				if (navigation.pending === transition) {
					if (!navigation.commit({ transition, url: page.url })) {
						navigation.cancel(transition);
					}
					publishNavigation();
				}
			} catch {
				if (navigation.cancel(transition)) {
					publishNavigation();
				}
			}
		})
	);

	onMount(() => {
		mobileBackStore.set(() => {
			if ($blockingOverlayOpenStore || navigation.pending) {
				return;
			}
			if (navigation.state.backPath) {
				history.back();
			} else {
				void goto('/', { replaceState: true });
			}
		});
		return () => mobileBackStore.set(undefined);
	});

	onMount(() =>
		blockingOverlayOpenStore.subscribe((blocking) => {
			void setMobilePresentation(blocking).catch(() => {
				// Native resets presentation when an expired runtime is removed.
			});
		})
	);

	onMount(() => {
		let disposed = false;
		let disconnect: (() => Promise<void>) | undefined;
		void connectMobileInteractions({
			onBack: () => $mobileBackStore?.(),
			onRefresh: async (requestId) => {
				try {
					if (
						disposed ||
						$blockingOverlayOpenStore ||
						navigation.pending ||
						page.url.pathname !== '/' ||
						page.url.searchParams.has('search')
					) {
						return;
					}
					await refreshWallet();
				} catch (error) {
					if (
						!disposed &&
						page.url.pathname === '/' &&
						!(error instanceof DOMException && error.name === 'AbortError')
					) {
						toastsError({ msg: { text: $i18n.core.mobile_shell.refresh_failed } });
					}
				} finally {
					await finishMobileRefresh(requestId).catch(() => {
						// Native may already have ended this pull after navigation or expiry.
					});
				}
			}
		})
			.then(async (remove) => {
				if (disposed) {
					await remove();
				} else {
					disconnect = remove;
				}
			})
			.catch(() => {
				// Native times out incomplete interactions; ordinary web Back remains usable.
			});
		return () => {
			disposed = true;
			cancelWalletRefresh();
			void disconnect?.();
		};
	});

	onMount(() => {
		let previous: boolean | undefined;
		return isPrivacyMode.subscribe((hidden) => {
			if (previous !== undefined && previous !== hidden) {
				// Never reveal balances from a cached list after privacy mode changes.
				void clearMobileBack().catch(() => {});
			}
			previous = hidden;
		});
	});

	onNavigate(async ({ from, to }) => {
		const { root } = navigation.state;
		if (
			from?.url.pathname !== '/' ||
			to?.url.pathname !== '/transactions/' ||
			$blockingOverlayOpenStore ||
			(root !== 'wallet' && root !== 'search')
		) {
			return;
		}
		try {
			// Await native's bounded capture while the source list is still rendered.
			await prepareMobileBack({ root, backPath: `${from.url.pathname}${from.url.search}` });
		} catch {
			// Capture failure disables the edge gesture, not access to the token.
		}
	});

	beforeNavigate(({ from, to, type, cancel }) => {
		if (!to) {
			return;
		}
		// Capture before SvelteKit updates browser history and WebKit changes scroll.
		if (from?.url.pathname === '/' && to.url.pathname === '/transactions/') {
			listScroll = { path: `${from.url.pathname}${from.url.search}`, x: scrollX, y: scrollY };
		}
		if (
			(to.url.protocol !== 'https:' && !mobileRouteAllowed(to.url)) ||
			(type === 'popstate' && !navigation.canGoBack(to.url))
		) {
			cancel();
			return;
		}
		cancelWalletRefresh();
	});
	afterNavigate(async () => {
		const rendering = ++renderRevision;
		const returning = navigation.canGoBack(page.url);
		const transition = navigation.pending;
		const committed = transition
			? navigation.commit({ transition, url: page.url })
			: navigation.commitRoute(page.url);
		if (!committed) {
			return;
		}
		// Report a committed screen only after the shared list's coalesced render
		// and scroll restoration. Native can then remove its transition cover safely.
		await tick();
		await new Promise<void>((resolve) =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
		);
		if (
			rendering !== renderRevision ||
			navigation.pending ||
			navigation.state.path !== `${page.url.pathname}${page.url.search}`
		) {
			return;
		}
		if (returning && listScroll?.path === navigation.state.path) {
			scrollTo(listScroll.x, listScroll.y);
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		}
		if (rendering === renderRevision && !navigation.pending) {
			publishNavigation();
		}
	});

	$effect(() => {
		void publishMobileAccount($ethAddress ?? undefined).catch(() => {
			// Expiry/navigation teardown may finish before an address load. Native fails closed.
		});
	});
</script>

<div
	aria-hidden="true"
	data-mobile-host
	data-mobile-refresh={page.url.pathname === '/' &&
	!page.url.searchParams.has('search') &&
	!$blockingOverlayOpenStore
		? ''
		: undefined}
></div>

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
	/* UIKit owns pull-to-refresh only on Wallet. Other routes and modal surfaces
	   retain their existing overscroll containment. */
	:global(html:has([data-mobile-refresh])),
	:global(body:has([data-mobile-refresh])) {
		overscroll-behavior-y: auto;
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
