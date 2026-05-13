<script lang="ts">
	import type { Snippet } from 'svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import PwaBanner from '$lib/components/core/PwaBanner.svelte';
	import SignerLogout from '$lib/components/signer/SignerLogout.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<main class="mx-auto flex w-full max-w-[576px] flex-col gap-y-6 px-5 pt-10">
	<div class="relative flex min-h-10 items-center justify-center">
		<div class="hidden 1.5xs:block"><OisyWalletLogoLink /></div>

		{#if $authSignedIn}
			<div class="absolute inset-y-0 right-0 flex items-center">
				<SignerLogout />
			</div>
		{/if}
	</div>

	{@render children()}
</main>

<Modals />

<!-- TODO remove this WarningBanner again as soon a solution is found for enabling display type standalone  -->
<PwaBanner />
