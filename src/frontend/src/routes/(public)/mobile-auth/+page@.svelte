<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { browser } from '$app/environment';
	import Header from '$lib/components/hero/Header.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		MOBILE_AUTH_OPENID_PROVIDER_PARAM,
		MOBILE_AUTH_REDIRECT_URI_PARAM,
		MOBILE_AUTH_SESSION_PUBLIC_KEY_PARAM
	} from '$lib/constants/mobile-auth.constants';
	import { signInMobileAuthBridge } from '$lib/services/auth-mobile-bridge.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		buildMobileAuthCallbackUrl,
		isAllowedMobileAuthRedirectUri,
		isOpenIdProvider,
		isValidEd25519DerPublicKey,
		parseMobileAuthCallbackUrl
	} from '$lib/utils/auth-mobile.utils';
	import { consoleError } from '$lib/utils/console.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	type BridgeState = 'idle' | 'signing' | 'redirecting' | 'invalid' | 'error';

	// Reading `location.search` directly (instead of the router state) keeps the
	// validation logic byte-identical between SSG hydration and a plain reload.
	const readParam = (name: string): string | null =>
		browser ? new URLSearchParams(window.location.search).get(name) : null;

	const sessionPublicKeyDerHex = readParam(MOBILE_AUTH_SESSION_PUBLIC_KEY_PARAM);
	const redirectUri = readParam(MOBILE_AUTH_REDIRECT_URI_PARAM);
	const openIdProviderParam = readParam(MOBILE_AUTH_OPENID_PROVIDER_PARAM);

	// One-Click sign-in is optional: an absent provider means the standard
	// Internet Identity flow; an unknown value is a malformed request.
	const openIdProvider = isOpenIdProvider(openIdProviderParam) ? openIdProviderParam : undefined;

	const validRequest =
		isValidEd25519DerPublicKey(sessionPublicKeyDerHex) &&
		isAllowedMobileAuthRedirectUri(redirectUri) &&
		(isNullish(openIdProviderParam) || nonNullish(openIdProvider));

	let flow = $state<BridgeState>(browser && !validRequest ? 'invalid' : 'idle');
	// Held so the "redirecting" state can offer a tappable deep link.
	let callbackUrl = $state<string | undefined>();

	// Sign-in must start from a user gesture: Internet Identity opens in a
	// popup, and popup blockers only allow it inside a click handler.
	const onContinue = async () => {
		if (!validRequest || isNullish(sessionPublicKeyDerHex) || isNullish(redirectUri)) {
			flow = 'invalid';
			return;
		}

		flow = 'signing';

		try {
			const { delegationChainJson } = await signInMobileAuthBridge({
				sessionPublicKeyDerHex,
				...(nonNullish(openIdProvider) ? { openIdProvider } : {})
			});

			const url = buildMobileAuthCallbackUrl({ redirectUri, delegationChainJson });

			// Defense in depth: the callback URL we just built must round-trip.
			if (isNullish(parseMobileAuthCallbackUrl(url))) {
				flow = 'error';
				return;
			}

			callbackUrl = url;
			flow = 'redirecting';

			// Best-effort automatic hand-off. Browsers (notably iOS Safari and
			// Chrome Custom Tabs) block programmatic navigation to a custom
			// scheme when it is not tied to a user gesture — and we are past the
			// async II round-trip here — so this often no-ops. The tappable link
			// rendered in the `redirecting` state is the reliable path back.
			window.location.href = url;
		} catch (err: unknown) {
			consoleError('Mobile auth bridge sign-in failed', err);
			flow = 'error';
		}
	};
</script>

<svelte:head>
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<Header />

	<main class="flex flex-1 items-center justify-center px-4 py-8">
		<div class="flex w-full max-w-[576px] flex-col rounded-3xl bg-primary p-6 shadow-lg md:p-8">
			<h1 class="mb-4 text-2xl font-bold">{$i18n.mobile_auth.text.title}</h1>

			{#if flow === 'invalid'}
				<p>{replaceOisyPlaceholders($i18n.mobile_auth.error.invalid_request)}</p>
			{:else if flow === 'error'}
				<p>{replaceOisyPlaceholders($i18n.mobile_auth.error.error_while_signing_in)}</p>
			{:else if flow === 'redirecting'}
				<p class="mb-6">{replaceOisyPlaceholders($i18n.mobile_auth.text.redirecting)}</p>

				<!-- The tap is a user gesture, which the OS honours for the custom-scheme
				     deep link even when the earlier programmatic navigation was blocked. -->
				<a
					class="flex flex-1 justify-center rounded-lg bg-brand-primary px-4 py-3 font-bold text-white no-underline"
					data-tid="mobile-auth-return"
					href={callbackUrl}
				>
					{replaceOisyPlaceholders($i18n.mobile_auth.text.return_to_app)}
				</a>
			{:else}
				<p class="mb-6">{replaceOisyPlaceholders($i18n.mobile_auth.text.description)}</p>

				<Button
					loading={flow === 'signing'}
					onclick={onContinue}
					testId="mobile-auth-continue"
					type="button"
				>
					{$i18n.mobile_auth.text.continue}
				</Button>
			{/if}
		</div>
	</main>
</div>
