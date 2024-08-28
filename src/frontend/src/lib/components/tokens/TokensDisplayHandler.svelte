<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { pointerEventsHandler } from '$lib/utils/events.utils';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';
	import { combinedDerivedTokensUi } from '$lib/derived/tokens-ui.derived';

	// We start it as undefined to avoid showing an empty list before the first update.
	export let tokens: Token[] | undefined = undefined;

	let displayZeroBalance: boolean;
	$: displayZeroBalance = $hideZeroBalancesStore?.enabled !== true;

	$: tokens = $combinedDerivedTokensUi.filter(
		({ usdBalance }) => (usdBalance ?? 0) || displayZeroBalance
	);
</script>

<div use:pointerEventsHandler>
	<slot />
</div>
