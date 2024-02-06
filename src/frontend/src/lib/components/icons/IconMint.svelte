<script lang="ts">
	import IconConvert from '$lib/components/icons/IconConvert.svelte';

	export let styleClass: string | undefined = undefined;
	export let size = '24';
</script>

<IconConvert {styleClass} {size} direction="in" />
