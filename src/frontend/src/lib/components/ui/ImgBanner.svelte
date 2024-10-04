<script lang="ts">
	import Img from '$lib/components/ui/Img.svelte';

	export let src: string;
	export let alt = '';
	export let width: string | undefined = undefined;
	export let size: 'small' | 'big' = 'small';
</script>

<div class="relative block" class:h-56={size === 'big'} class:h-40={size === 'small'}>
	<div class="absolute w-full">
		<Img {src} {alt} {width} />
	</div>
</div>
