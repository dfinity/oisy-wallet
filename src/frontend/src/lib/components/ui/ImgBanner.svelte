<script lang="ts">
	import { themeStore } from '@dfinity/gix-components';
	import Img from '$lib/components/ui/Img.svelte';

	export let src: string;
	export let alt = '';
	export let styleClass: string | undefined = undefined;
</script>

<Img {src} {alt} styleClass="w-full h-auto aspect-video {styleClass ?? ''}" />
