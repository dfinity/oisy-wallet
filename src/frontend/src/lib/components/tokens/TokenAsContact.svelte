<script lang="ts">
	import { slide } from 'svelte/transition';
	import Divider from '$lib/components/common/Divider.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import type { Token } from '$lib/types/token';

	interface Props {
		token: Token;
	}

	const { token }: Props = $props();

	let { symbol } = $derived(token);
</script>

<span class="inline-flex min-w-0 items-center gap-1" in:slide={SLIDE_PARAMS}>
	<span class="shrink-0">
		<TokenLogo data={token} logoSize="xxs" />
	</span>

	<span class="flex min-w-0 flex-wrap items-center">
		<span class="inline-block max-w-38 truncate">
			{token.name}
		</span>
		<span class="inline-flex items-center text-tertiary">
			<Divider />
			<span class="inline-block max-w-20 truncate sm:max-w-29 lg:max-w-34">
				{symbol}
			</span>
		</span>
	</span>
</span>
