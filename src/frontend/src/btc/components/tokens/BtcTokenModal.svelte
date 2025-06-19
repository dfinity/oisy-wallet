<script lang="ts">
	import TokenModal from '$lib/components/tokens/TokenModal.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';
	import type { NavigationTarget } from '@sveltejs/kit';

	interface Props {
		from?: NavigationTarget
	}

	let {from}: Props = $props();
</script>

<TokenModal token={$pageToken} {from} />
