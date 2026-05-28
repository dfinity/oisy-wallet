<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ScannedPlainAddressNotice from '$lib/components/send/ScannedPlainAddressNotice.svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import { isNetworkIdBTCMainnet } from '$lib/utils/network.utils';

	interface Props {
		onSendToken: (token: Token) => void;
		onSelectNetworkFilter: () => void;
		lockedNetworkIds?: NetworkId[];
	}

	let { onSendToken, onSelectNetworkFilter, lockedNetworkIds }: Props = $props();

	let lockedSingleToken = $derived(
		nonNullish(lockedNetworkIds) &&
			lockedNetworkIds.length === 1 &&
			isNetworkIdBTCMainnet(lockedNetworkIds[0])
	);

	const onTokenButtonClick = (token: Token) => {
		onSendToken(token);
	};
</script>

<ModalTokensList
	networkSelectorViewOnly={(nonNullish(lockedNetworkIds) && lockedNetworkIds.length > 0) ||
		nonNullish($selectedNetwork)}
	{onSelectNetworkFilter}
	{onTokenButtonClick}
>
	{#snippet topBanner()}
		<ScannedPlainAddressNotice variant={lockedSingleToken ? 'single-token' : 'multi-token'} />
	{/snippet}
	{#snippet tokenListItem(token, onClick)}
		<ModalTokensListItem {onClick} {token} />
	{/snippet}
	{#snippet noResults()}
		<p class="text-primary">
			{$i18n.tokens.manage.text.all_tokens_zero_balance}
		</p>
	{/snippet}
	{#snippet toolbar()}
		<ButtonCloseModal />
	{/snippet}
</ModalTokensList>
