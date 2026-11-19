<!-- Ported from @dfinity/gix-components DropdownItem. -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		value: string;
		children?: Snippet;
	}

	let { value, children }: Props = $props();
</script>

<option {value}>{@render children?.()}</option>
