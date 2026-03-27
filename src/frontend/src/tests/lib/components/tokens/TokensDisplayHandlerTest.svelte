<script lang="ts">
	import TokensDisplayHandler from '$lib/components/tokens/TokensDisplayHandler.svelte';
	import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';

	interface Props {
		childTestId: string;
		tokenCountTestId: string;
	}

	let { childTestId, tokenCountTestId }: Props = $props();

	let tokens = $state<TokenUiOrGroupUi[] | undefined>();
</script>

<TokensDisplayHandler bind:tokens>
	<div data-tid={childTestId}>Child</div>;
</TokensDisplayHandler>

<!-- Expose tokens length to the DOM so tests can assert -->
<div data-tid={tokenCountTestId}>{tokens?.length ?? 0}</div>
