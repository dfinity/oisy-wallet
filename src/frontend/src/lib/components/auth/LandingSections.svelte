<!-- Ship the scoped styles in the lazy module so the app shell cannot link them eagerly. -->
<svelte:options css="injected" />

<script lang="ts">
	import LandingBorrowPreview from '$lib/components/auth/LandingBorrowPreview.svelte';
	import LandingClose from '$lib/components/auth/LandingClose.svelte';
	import LandingConnect from '$lib/components/auth/LandingConnect.svelte';
	import LandingGive from '$lib/components/auth/LandingGive.svelte';
	import LandingHoldPreview from '$lib/components/auth/LandingHoldPreview.svelte';
	import LandingNetworks from '$lib/components/auth/LandingNetworks.svelte';
	import LandingSection from '$lib/components/auth/LandingSection.svelte';
	import LandingSecurity from '$lib/components/auth/LandingSecurity.svelte';
	import LandingSwapPreview from '$lib/components/auth/LandingSwapPreview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<LandingNetworks />

<LandingSection
	id="landing-hold"
	description={$i18n.auth.landing.hold_description}
	eyebrow={$i18n.auth.landing.hold_eyebrow}
	points={[
		$i18n.auth.landing.hold_point_filter,
		$i18n.auth.landing.hold_point_collectibles,
		$i18n.auth.landing.hold_point_currency
	]}
	title={$i18n.auth.landing.hold_title}
>
	{#snippet visual()}
		<LandingHoldPreview />
	{/snippet}
</LandingSection>

<!-- Second, because it answers the hero's promise: is it safe, and how do I get in? -->
<LandingSecurity />

<LandingSection
	id="landing-swap"
	description={replaceOisyPlaceholders($i18n.auth.landing.swap_description)}
	eyebrow={$i18n.auth.landing.swap_eyebrow}
	flip
	points={[$i18n.auth.landing.swap_point_fee, $i18n.auth.landing.swap_point_limit]}
	title={$i18n.auth.landing.swap_title}
>
	{#snippet visual()}
		<LandingSwapPreview />
	{/snippet}
</LandingSection>

<LandingGive />

<LandingSection
	id="landing-borrow"
	description={$i18n.auth.landing.borrow_description}
	eyebrow={$i18n.auth.landing.borrow_eyebrow}
	points={[$i18n.auth.landing.borrow_point_fees, $i18n.auth.landing.borrow_point_repay]}
	title={$i18n.auth.landing.borrow_title}
>
	{#snippet visual()}
		<LandingBorrowPreview />
	{/snippet}
</LandingSection>

<LandingConnect />

<LandingClose />
