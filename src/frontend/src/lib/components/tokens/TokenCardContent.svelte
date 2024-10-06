<script lang="ts">
	import TokenBalance from '$lib/components/tokens/TokenBalance.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import CardAmount from '$lib/components/ui/CardAmount.svelte';
	import type { TokenUi } from '$lib/types/token';

	export let token: TokenUi;
</script>

<TokenCard {token}>
	<CardAmount slot="balance">
		<TokenBalance {token} />
	</CardAmount>
</TokenCard>
