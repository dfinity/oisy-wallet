<!-- Ship the scoped styles in the lazy module so the app shell cannot link them eagerly. -->
<svelte:options css="injected" />

<script lang="ts">
	import { onMount } from 'svelte';
	import LandingBorrowPreview from '$lib/components/auth/LandingBorrowPreview.svelte';
	import LandingClose from '$lib/components/auth/LandingClose.svelte';
	import LandingConnect from '$lib/components/auth/LandingConnect.svelte';
	import LandingGetStarted from '$lib/components/auth/LandingGetStarted.svelte';
	import LandingGive from '$lib/components/auth/LandingGive.svelte';
	import LandingHoldPreview from '$lib/components/auth/LandingHoldPreview.svelte';
	import LandingNetworks from '$lib/components/auth/LandingNetworks.svelte';
	import LandingSection from '$lib/components/auth/LandingSection.svelte';
	import LandingSecurity from '$lib/components/auth/LandingSecurity.svelte';
	import LandingSwapPreview from '$lib/components/auth/LandingSwapPreview.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	onMount(() => {
		// A landing fragment can arrive before this lazy chunk has mounted.
		const { hash } = window.location;

		if (!hash.startsWith('#landing-')) {
			return;
		}

		const target = document.getElementById(hash.slice(1));
		target?.scrollIntoView();
		target?.focus({ preventScroll: true });
	});
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

<LandingGetStarted />

<LandingSection
	id="landing-swap"
	description={$i18n.auth.landing.swap_description}
	eyebrow={$i18n.swap.text.smart_swap}
	flip
	points={[
		$i18n.auth.landing.swap_point_fee,
		$i18n.auth.landing.swap_point_value_warning,
		$i18n.auth.landing.swap_point_slippage
	]}
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
