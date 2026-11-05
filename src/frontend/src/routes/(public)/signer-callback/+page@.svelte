<script lang="ts">
	import { browser } from '$app/environment';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { SIGNER_CALLBACK_RETURN_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { getMobileAuthCallbackUrl } from '$lib/utils/mobile-auth-callback.utils';

	// Preserve the existing preview's callback while HTTPS SDK auth is tested.
	// The native request owner validates the response; this page only relays it.
	const rescueUrl = getMobileAuthCallbackUrl(browser ? window.location.hash : '');
</script>

<svelte:head>
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="p-6"><OisyWalletLogo markOnly /></header>
	<main class="flex flex-1 items-center justify-center px-4 py-8">
		<div class="flex w-full max-w-[576px] flex-col rounded-3xl bg-primary p-6 md:p-8">
			<h1 class="mb-4 text-2xl font-bold">{$i18n.auth.text.return_to_app}</h1>
			{#if rescueUrl}
				<p class="mb-6">{$i18n.auth.text.continue_sign_in_in_app}</p>
				<a
					class="flex min-h-11 items-center justify-center rounded-lg bg-brand-primary px-4 py-3 font-bold text-white no-underline active:opacity-80"
					data-tid={SIGNER_CALLBACK_RETURN_BUTTON}
					href={rescueUrl}>{$i18n.auth.text.open_app}</a
				>
			{:else}
				<p>{$i18n.auth.error.missing_mobile_callback}</p>
			{/if}
		</div>
	</main>
</div>
