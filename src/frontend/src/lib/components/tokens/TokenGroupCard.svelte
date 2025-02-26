<script lang="ts">
	import { slide } from 'svelte/transition';
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import { TOKEN_GROUP } from '$lib/constants/test-ids.constants';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { tokenGroupStore } from '$lib/stores/token-group.store';
	import type { CardData } from '$lib/types/token-card';
	import type { TokenUiGroup } from '$lib/types/token-group';
	import { mapHeaderData } from '$lib/utils/token-card.utils';

	export let tokenGroup: TokenUiGroup;

	let isExpanded: boolean;
	$: isExpanded = ($tokenGroupStore ?? {})[tokenGroup.id]?.isExpanded ?? false;

	let headerData: CardData;
	$: headerData = mapHeaderData(tokenGroup);

	const toggleIsExpanded = (toggle: boolean) =>
		tokenGroupStore.set({ tokenId: tokenGroup.id, data: { isExpanded: toggle } });
</script>

<div class="flex flex-col">
	<MultipleListeners tokens={tokenGroup.tokens}>
		<TokenCardWithOnClick
			on:click={() => toggleIsExpanded(!isExpanded)}
			styleClass="px-3 py-2 hover:bg-brand-subtle-10 {isExpanded
				? 'bg-primary rounded-b-none'
				: ''}"
		>
			<TokenCardContent data={headerData} hideNetworkLogo testIdPrefix={TOKEN_GROUP} />
		</TokenCardWithOnClick>
	</MultipleListeners>

	{#if isExpanded}
		<div class="flex flex-col gap-0 bg-secondary" transition:slide={SLIDE_PARAMS}>
			{#each tokenGroup.tokens as token (token.id)}
				<TokenCardWithUrl styleClass="p-3 hover:bg-brand-subtle-10" {token}>
					<TokenCardContent logoSize="md" data={token} />
				</TokenCardWithUrl>
			{/each}
		</div>
	{/if}
</div>
