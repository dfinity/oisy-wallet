<script lang="ts">
	import Img from '$lib/components/ui/Img.svelte';
	import { themeStore } from '@dfinity/gix-components';

	export let src: string;
	export let alt = '';
	export let styleClass: string | undefined = undefined;
	export let testId: string | undefined = undefined;
</script>

<Img {src} {alt} {testId} styleClass="w-full h-auto aspect-video {styleClass ?? ''}" />
