<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';

	export let size: string | undefined = '20';
	export let expanded = false;
</script>

<span class="flex transition-transform duration-500" class:rotate-x-180={expanded}>
	<IconExpandMore {size} />
</span>
