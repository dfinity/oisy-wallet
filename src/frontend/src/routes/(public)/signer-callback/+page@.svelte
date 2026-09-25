<script lang="ts">
	import { browser } from '$app/environment';
	import Header from '$lib/components/hero/Header.svelte';
	import { MOBILE_AUTH_CALLBACK_URI } from '$lib/constants/mobile-auth.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	// ICRC-167 delegation callback target. When universal links work, the OS
	// routes this URL straight into the app and this page never renders. It
	// renders only as a fallback — app not installed, or app-link verification
	// failed — and then offers the phase-1 custom-scheme deep link carrying the
	// same fragment, which the app's callback handler also understands.
	const rescueUrl = browser
		? `${MOBILE_AUTH_CALLBACK_URI}${window.location.hash}`
		: MOBILE_AUTH_CALLBACK_URI;
</script>

<svelte:head>
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<Header />

	<main class="flex flex-1 items-center justify-center px-4 py-8">
		<div class="flex w-full max-w-[576px] flex-col rounded-3xl bg-primary p-6 shadow-lg md:p-8">
			<h1 class="mb-4 text-2xl font-bold">{$i18n.mobile_auth.text.title}</h1>

			<p class="mb-6">{replaceOisyPlaceholders($i18n.mobile_auth.text.redirecting)}</p>

			<a
				class="flex flex-1 justify-center rounded-lg bg-brand-primary px-4 py-3 font-bold text-white no-underline"
				data-tid="signer-callback-return"
				href={rescueUrl}
			>
				{replaceOisyPlaceholders($i18n.mobile_auth.text.return_to_app)}
			</a>
		</div>
	</main>
</div>
