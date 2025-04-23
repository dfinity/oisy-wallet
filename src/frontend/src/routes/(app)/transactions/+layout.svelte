<script lang="ts">
	import Listener from '$lib/components/core/Listener.svelte';
	import { token } from '$lib/stores/token.store';
</script>

<Listener token={$token}>
	<slot />
</Listener>
