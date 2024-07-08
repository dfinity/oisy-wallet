<script lang="ts">
	import Header from '$lib/components/hero/Header.svelte';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import HeroContent from '$lib/components/hero/HeroContent.svelte';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import Alpha from '$lib/components/core/Alpha.svelte';

	export let usdTotal = false;
	export let summary = false;
	export let actions = true;
	export let send = false;

	let background: string;
	$: background = ($selectedNetwork?.id.description ?? 'chainfusion').toLowerCase();
</script>

<div class={`hero ${background}`}>
	<Header />

	<article
		class="flex flex-col text-off-white rounded-lg pt-1 sm:pt-3 pb-2 px-8 relative main"
		class:2xl:mt-[-70px]={$authSignedIn}
		class:xl:mt-[-70px]={!$authSignedIn}
	>
		<Alpha />

		{#if $authSignedIn}
			<HeroContent {usdTotal} {summary} {actions} {send} />
		{:else}
			<HeroSignIn />
		{/if}
	</article>
</div>

<style lang="scss">
	.hero {
		background: linear-gradient(61.79deg, #321469 62.5%, var(--color-misty-rose) 100%);

		--alpha-color: var(--color-grey);

		&.icp {
			background: radial-gradient(66.11% 97.11% at 50% 115.28%, #300097 0%, #1f005e 100%);
		}

		&.sepoliaeth {
			background: linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.5) 100%),
				linear-gradient(62deg, #321469 62.5%, #937993 100%);
		}

		&.chainfusion {
			background: radial-gradient(
				90.18% 135.69% at 50% 135.69%,
				#3653cb 0%,
				#5331a6 40.06%,
				#191e86 100%
			);
		}
	}
</style>
