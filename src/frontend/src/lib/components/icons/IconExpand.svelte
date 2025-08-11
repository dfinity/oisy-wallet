<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';

	interface Props {
		size?: string;
		expanded?: boolean;
	}

	let { size = '20', expanded = false }: Props = $props();
</script>

<span class="flex transition-transform duration-500" class:rotate-x-180={expanded}>
	<IconExpandMore {size} />
</span>
