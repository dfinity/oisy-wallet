<script lang="ts">
	import IconExpandMore from '$lib/components/icons/IconExpandMore.svelte';

	interface Props {
		size?: string;
		expanded?: boolean;
		axis?: 'x' | 'y';
	}

	let { size = '20', expanded = false, axis = 'x' }: Props = $props();
</script>

<span class="flex">
	<span
		class="flex origin-center transition-transform duration-500"
		class:-rotate-90={axis === 'y'}
		class:rotate-x-0={!expanded}
		class:rotate-x-180={expanded}
	>
		<IconExpandMore {size} />
	</span>
</span>
