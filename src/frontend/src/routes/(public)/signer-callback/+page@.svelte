<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	// A valid HTTPS authentication session intercepts this URL before loading it.
	// If it reaches a page, discard the response. Never relay it to another app.
	onMount(() => {
		const discardResponse = () => replaceState(window.location.pathname, {});
		discardResponse();
		window.addEventListener('hashchange', discardResponse);
		return () => window.removeEventListener('hashchange', discardResponse);
	});
</script>

<svelte:head>
	<meta name="referrer" content="no-referrer" />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="p-6"><OisyWalletLogo markOnly /></header>
	<main class="flex flex-1 items-center justify-center px-4 py-8">
		<div class="flex w-full max-w-[576px] flex-col rounded-3xl bg-primary p-6 md:p-8">
			<h1 class="mb-4 text-2xl font-bold">{$i18n.auth.text.return_to_app}</h1>
			<p>{$i18n.auth.error.missing_mobile_callback}</p>
		</div>
	</main>
</div>
