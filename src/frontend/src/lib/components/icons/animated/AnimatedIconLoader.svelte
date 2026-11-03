<script lang="ts">
	import Spinner from '$lib/components/ui/Spinner.svelte';

	interface Props {
		size?: string;
	}

	let { size = '22' }: Props = $props();
</script>

<Spinner inline size={Number.isFinite(Number(size)) ? `${Number(size)}px` : size} />
