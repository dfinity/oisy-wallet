<script lang="ts">
	import Header from '$lib/components/hero/Header.svelte';
	import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import HeroContent from '$lib/components/hero/HeroContent.svelte';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import Alpha from '$lib/components/core/Alpha.svelte';
	import ThreeBackground from '$lib/components/ui/ThreeBackground.svelte';
	import { slide, fade } from 'svelte/transition';

	export let usdTotal = false;
	export let summary = false;
	export let actions = true;
	export let more = false;

	let background: string;
	$: background = ($selectedNetwork?.id.description ?? 'chainfusion').toLowerCase();

	// We only want to display the "Sign-in" call to action on pages that actually are displaying any content in the Hero pane.
	let heroContent = true;
	$: heroContent = usdTotal || summary;

	let isCollapsed = false;

	const setCollapse = (collapse: boolean) => {
		if (collapseDisabled) {
			return;
		}
		isCollapsed = $authSignedIn && collapse;
	};

	let collapseDisabled = false;
	const enableScrollHandler = () => (collapseDisabled = false);
	const disableScrollHandler = () => (collapseDisabled = true);

	let observer: IntersectionObserver;

	const heroRef = (node: HTMLElement) => {
		if (observer) {
			observer.disconnect();
		}

		observer = new IntersectionObserver(
			(entries) => {
				if (collapseDisabled) {
					return;
				}

				entries.forEach((entry) => setCollapse(!entry.isIntersecting));
			},
			{ threshold: 0 }
		);

		observer.observe(node);
	};
</script>

<!-- This is a "sentinel" to observe the scrolling -->
<div use:heroRef></div>

<div
	class={`hero ${isCollapsed ? '' : 'pb-4 md:pb-6'} ${background} sticky top-0 z-[var(--overlay-z-index)]`}
>
	{#if $pseudoNetworkChainFusion && !isCollapsed}
		<div in:fade={{ duration: 250 }} out:fade={{ duration: 250 }}>
			<ThreeBackground />
		</div>
	{/if}

	<Header />

	{#if !isCollapsed}
		<article
			class="flex flex-col text-off-white rounded-lg pt-1 sm:pt-3 pb-2 px-8 relative main 2xl:mt-[-70px] items-center"
			transition:slide={{ duration: 250 }}
			on:introstart={disableScrollHandler}
			on:introend={enableScrollHandler}
			on:outrostart={disableScrollHandler}
			on:outroend={enableScrollHandler}
		>
			<Alpha />

			{#if $authSignedIn}
				<HeroContent {usdTotal} {summary} {actions} {more} />
			{:else if heroContent}
				<HeroSignIn />
			{/if}
		</article>
	{/if}
</div>

<style lang="scss">
	.hero {
		--alpha-color: var(--color-grey);

		&.icp {
			background: radial-gradient(66.11% 97.11% at 50% 115.28%, #300097 0%, #1f005e 100%);
		}

		&.eth {
			background: linear-gradient(61.79deg, #321469 62.5%, var(--color-misty-rose) 100%);
		}

		&.sepoliaeth {
			background: linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.5) 100%),
				linear-gradient(62deg, #321469 62.5%, #937993 100%);
		}

		&.chainfusion {
			background: #010155;
		}
	}
</style>
