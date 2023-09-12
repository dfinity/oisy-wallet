<script lang="ts">
	import Img from '$lib/components/ui/Img.svelte';

	export let src: string;
	export let alt = '';
	export let width: string | undefined = undefined;
	export let height: string | undefined = undefined;
	export let borderColor: 'dust' | 'off-white' = 'dust';
</script>

<div
	class="flex items-center justify-center rounded-50"
	style={`border: 1px solid var(--color-${borderColor})`}
>
	<Img {src} {alt} {width} {height} />
</div>
