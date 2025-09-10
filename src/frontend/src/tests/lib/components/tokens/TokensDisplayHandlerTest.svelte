<script lang="ts">
	import TokensDisplayHandler from '$lib/components/tokens/TokensDisplayHandler.svelte';
	import type { TokenUiOrGroupUi } from '$lib/types/token-group';

	interface Props {
		animating: boolean;
		childTestId: string;
		tokenCountTestId: string;
		buttonTestId: string;
	}

	let { animating, childTestId, tokenCountTestId, buttonTestId }: Props = $props();

	let tokens = $state<TokenUiOrGroupUi[] | undefined>();

	const stopAnimating = () => {
		animating = false;
	};
</script>

<TokensDisplayHandler {animating} bind:tokens>
	<div data-tid={childTestId}>Child</div>;
</TokensDisplayHandler>

<!-- Expose tokens length to the DOM so tests can assert -->
<div data-tid={tokenCountTestId}>{tokens?.length ?? 0}</div>

<button data-tid={buttonTestId} onclick={stopAnimating} type="button">Stop animating</button>
