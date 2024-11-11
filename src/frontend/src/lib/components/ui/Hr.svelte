<script lang="ts">
	import type { Size } from '$lib/types/components';

	export let spacing: 'none' | Extract<Size, 'lg' | 'md'> = 'none';
</script>

<hr
	class="opacity-10"
	class:my-6={spacing === 'lg'}
	class:my-4={spacing === 'md'}
	style="width: 100%; border: 0.05rem solid"
/>
