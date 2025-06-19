<script lang="ts">
	import type { Size } from '$lib/types/components';

	interface Props {
		spacing?: 'none' | Extract<Size, 'lg' | 'md'>;
	}

	let { spacing = 'none' }: Props = $props();
</script>

<hr
	class="bg-brand-subtle-10"
	class:my-6={spacing === 'lg'}
	class:my-4={spacing === 'md'}
	style="width: 100%; border: 0px; height: 1px"
/>
