<script lang="ts">
	import Toasts from '$lib/components/ui/Toasts.svelte';
	import type { ToastPosition } from '$lib/types/toast';

	interface Props {
		position?: ToastPosition;
		maxVisible?: number;
	}

	let { position = 'bottom', maxVisible }: Props = $props();
</script>

<!-- Wrapper avoids the Svelte "Cannot read properties of null (reading 'removeChild')"
	 issue when toasts unmount during a test. -->
<div>
	<Toasts {maxVisible} {position} />
</div>
