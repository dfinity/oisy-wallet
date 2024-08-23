<script lang="ts">
	import Header from '$lib/components/hero/Header.svelte';
	import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import HeroContent from '$lib/components/hero/HeroContent.svelte';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import Alpha from '$lib/components/core/Alpha.svelte';
	import ThreeBackground from '$lib/components/ui/ThreeBackground.svelte';

	export let usdTotal = false;
	export let summary = false;
	export let actions = true;
	export let more = false;

	let background: string;
	$: background = ($selectedNetwork?.id.description ?? 'chainfusion').toLowerCase();

	// We only want to display the "Sign-in" call to action on pages that actually are displaying any content in the Hero pane.
	let heroContent = true;
	$: heroContent = usdTotal || summary;
</script>

<div class={`hero pb-4 md:pb-6 ${background}`}>
	{#if $pseudoNetworkChainFusion}
		<ThreeBackground />
	{/if}

	<Header />

	<article
		class="flex flex-col text-off-white rounded-lg pt-1 sm:pt-3 px-8 relative main 2xl:mt-[-70px] items-center"
		style="padding-bottom: 32px"
	>
		<Alpha />

		{#if $authSignedIn}
			<HeroContent {usdTotal} {summary} {actions} {more} />
		{:else if heroContent}
			<HeroSignIn />
		{/if}
	</article>
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
			background: transparent;

			position: relative;
		}
	}
</style>
