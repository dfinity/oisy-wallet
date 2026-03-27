<script lang="ts">
	import Img from '$lib/components/ui/Img.svelte';

	interface Props {
		src: string;
		alt?: string;
		styleClass?: string;
		testId?: string;
	}

	let { src, alt = '', styleClass, testId }: Props = $props();
</script>

<Img {alt} {src} styleClass="w-full h-auto aspect-video {styleClass ?? ''}" {testId} />
