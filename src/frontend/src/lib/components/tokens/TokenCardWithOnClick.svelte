<script lang="ts">
	import type { Token } from '$lib/types/token';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';

	export let token: Token;
</script>

<div class="flex gap-3 sm:gap-8 mb-6">
	<button class="flex-1" on:click>
		<div class="w-full">
			<TokenCard {token}>
				<slot name="description" slot="description" />
				<slot name="exchange" slot="exchange" />
			</TokenCard>
		</div>
	</button>

	<slot name="actions" />
</div>
