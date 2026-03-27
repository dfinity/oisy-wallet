<script lang="ts">
	import type { NavigationTarget } from '@sveltejs/kit';
	import TokenModal from '$lib/components/tokens/TokenModal.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';

	interface Props {
		fromRoute?: NavigationTarget;
	}

	let { fromRoute }: Props = $props();
</script>

<TokenModal {fromRoute} token={$pageToken} />
