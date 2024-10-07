<script lang="ts">
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import type { Token } from '$lib/types/token';

	export let token: Token;
</script>

<TokenCard {token}>
	<span class="break-all" slot="description">
		-/- {token.symbol}
	</span>

	<span slot="exchange" class="mr-[3px] font-bold">-/-</span>
</TokenCard>
