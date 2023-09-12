<script lang="ts">
	import Listener from '$lib/components/core/Listener.svelte';
	import { token } from '$lib/derived/token.derived';
</script>

<Listener token={$token}>
	<slot />
</Listener>
