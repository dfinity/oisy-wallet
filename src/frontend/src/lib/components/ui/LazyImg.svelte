<script lang="ts">
	import Img from '$lib/components/ui/Img.svelte';

	export let src: string;
	export let alt = '';
</script>

{#await import(src) then { default: src }}
	<Img {src} {alt} />
{/await}
