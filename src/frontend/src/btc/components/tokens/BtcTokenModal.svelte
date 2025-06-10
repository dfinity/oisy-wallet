<script lang="ts">
	import TokenModal from '$lib/components/tokens/TokenModal.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';
</script>

<TokenModal token={$pageToken} />
