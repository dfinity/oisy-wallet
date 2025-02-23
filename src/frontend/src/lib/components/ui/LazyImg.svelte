<script lang="ts">
	import type { ComponentType } from 'svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';

	export let src: string;
	export let alt = '';
	export let styleClass: string | undefined = undefined;
	export let testId: string | undefined = undefined;
	export let asBanner = false;

	let cmp: ComponentType;
	$: cmp = asBanner ? ImgBanner : Img;
</script>

{#await import(src) then { default: src }}
	<svelte:component this={cmp} {src} {alt} {styleClass} {testId} />
{/await}
