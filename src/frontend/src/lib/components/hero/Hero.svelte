<script lang="ts">
	import Header from '$lib/components/hero/Header.svelte';
	import HeroContent from '$lib/components/hero/HeroContent.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';

	export let usdTotal = false;
	export let summary = false;
	export let actions = true;
	export let back: 'header' | 'hero' | undefined;
	export let testId: string | undefined = undefined;
</script>

<div class="pt-6">
	<Header back={back === 'header'} />

	{#if $authSignedIn}
		<article
			class="main relative flex flex-col items-center rounded-lg pb-6 pt-10"
			data-tid={testId}
		>
			<HeroContent {usdTotal} {summary} {actions} back={back === 'hero'} />
		</article>
	{/if}
</div>
