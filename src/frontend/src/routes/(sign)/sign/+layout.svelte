<script lang="ts">
	import Background from '$lib/components/core/Background.svelte';
	import LoadersGuard from '$lib/components/core/LoadersGuard.svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
</script>

<Background />

<main class="pt-10 flex flex-col gap-y-8">
	<div class="flex justify-center"><OisyWalletLogoLink /></div>

	<WarningBanner>
		This feature is unreviewed. DO NOT USE until it has undergone proper code and security
		assessment!
	</WarningBanner>

	<LoadersGuard>
		<slot />
	</LoadersGuard>
</main>

<Modals />

<style global lang="scss">
	@import './+oisy.page.css';
</style>
