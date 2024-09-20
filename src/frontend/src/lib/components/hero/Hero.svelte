<script lang="ts">
	import Header from '$lib/components/hero/Header.svelte';
	import HeroContent from '$lib/components/hero/HeroContent.svelte';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';

	export let usdTotal = false;
	export let summary = false;
	export let actions = true;
	export let back: 'header' | 'hero' | undefined;

	// We only want to display the "Sign-in" call to action on pages that actually are displaying any content in the Hero pane.
	let heroContent = true;
	$: heroContent = usdTotal || summary;
</script>

<div class={`pb-4 md:pb-6`}>
	<Header back={back === 'header'} />

	<article
		class="flex flex-col rounded-lg pt-1 sm:pt-3 px-8 relative main 2xl:mt-[-70px] items-center"
		style="padding-bottom: 32px"
	>
		{#if $authSignedIn}
			<HeroContent {usdTotal} {summary} {actions} back={back === 'hero'} />
		{:else if heroContent}
			<HeroSignIn />
		{/if}
	</article>
</div>
