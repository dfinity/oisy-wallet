<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<Modal>
	{@render children?.()}
</Modal>
