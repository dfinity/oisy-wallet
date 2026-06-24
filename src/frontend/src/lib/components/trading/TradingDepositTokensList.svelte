<script lang="ts">
	import type { IcToken } from '$icp/types/ic-token';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenNameAndNetwork from '$lib/components/tokens/TokenNameAndNetwork.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { oisyTradeDepositableTokens } from '$lib/derived/oisy-trade.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CardData } from '$lib/types/token-card';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		onSelect: (token: IcToken) => void;
		onClose: () => void;
	}

	let { onSelect, onClose }: Props = $props();
</script>

<ContentWithToolbar>
	<p class="mb-4 text-tertiary">{$i18n.trading.deposit.select_token}</p>

	<List noPadding>
		{#each $oisyTradeDepositableTokens as token (token.id)}
			{@const data = token as CardData}
			<ListItem styleClass="first-of-type:border-t-1">
				<LogoButton onClick={() => onSelect(token)}>
					{#snippet logo()}
						<span class="flex">
							<TokenLogo badge={{ type: 'network' }} color="white" {data} logoSize="lg" />
						</span>
					{/snippet}

					{#snippet title()}{getTokenDisplaySymbol(token)}{/snippet}

					{#snippet description()}
						<TokenNameAndNetwork {data} />
					{/snippet}
				</LogoButton>
			</ListItem>
		{/each}
	</List>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={onClose} />
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
