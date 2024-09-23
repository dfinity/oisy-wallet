<script lang="ts">
	import Header from '$lib/components/hero/Header.svelte';
	import HeroContent from '$lib/components/hero/HeroContent.svelte';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';

	export let usdTotal = false;
	export let summary = false;
	export let actions = true;
	export let back: 'header' | 'hero' | undefined;

	// We only want to display the "Sign-in" call to action on pages that actually are displaying any content in the Hero pane.
	let heroContent = true;
	$: heroContent = usdTotal || summary;
</script>

<div class="pt-6 space-y-10">
	<Header back={back === 'header'} />

	<article
		class="flex flex-col rounded-lg pb-6 relative main 2xl:mt-[-70px] items-center"
		class:pb-16={$authNotSignedIn}
	>
		{#if $authSignedIn}
			<HeroContent {usdTotal} {summary} {actions} back={back === 'hero'} />
		{:else if heroContent}
			<HeroSignIn />
		{/if}
	</article>
</div>
