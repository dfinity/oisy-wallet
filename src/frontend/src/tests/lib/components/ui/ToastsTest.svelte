<script lang="ts">
	import Toasts from '$lib/components/ui/Toasts.svelte';
	import type { ToastPosition } from '$lib/types/toast';

	interface Props {
		position?: ToastPosition;
		maxVisible?: number;
		elevated?: boolean;
	}

	let { position = 'bottom', maxVisible, elevated = false }: Props = $props();
</script>

<!-- Wrapper avoids the Svelte "Cannot read properties of null (reading 'removeChild')"
	 issue when toasts unmount during a test. -->
<div>
	<Toasts {elevated} {maxVisible} {position} />
</div>
