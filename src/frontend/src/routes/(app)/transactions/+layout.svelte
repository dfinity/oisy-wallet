<script lang="ts">
	import Listener from '$lib/components/core/Listener.svelte';
	import { token } from '$lib/stores/token.store';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<Listener token={$token}>
	{@render children()}
</Listener>
