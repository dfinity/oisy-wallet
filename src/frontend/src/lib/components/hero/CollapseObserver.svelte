<script lang="ts">
	import { onIntersection } from '$lib/directives/intersection.directives';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	const useIntersection = (node: HTMLElement) => onIntersection({ node, dispatch });
</script>

<div use:useIntersection></div>
