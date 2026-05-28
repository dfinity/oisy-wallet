<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ScannedPlainAddressNotice, {
		type ScannedPlainAddressNoticeVariant
	} from '$lib/components/send/ScannedPlainAddressNotice.svelte';
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

	let noticeVariant: ScannedPlainAddressNoticeVariant = $derived.by(() => {
		if (!nonNullish(lockedNetworkIds) || lockedNetworkIds.length === 0) {
			return 'multi-token';
		}
		if (lockedNetworkIds.length > 1) {
			return 'multi-network';
		}
		return isNetworkIdBTCMainnet(lockedNetworkIds[0]) ? 'single-token' : 'multi-token';
	});

	// Multi-network locks (EVM mainnets) leave the filter button interactive so the user
	// can drill into a specific chain; the popup then restricts the choices to the locked
	// subset. Single-network locks and URL-route filters keep the historical view-only
	// behaviour — there's no meaningful drill-down for a single network.
	let networkSelectorViewOnly = $derived.by(() => {
		if (nonNullish(lockedNetworkIds) && lockedNetworkIds.length > 1) {
			return false;
		}
		return (
			(nonNullish(lockedNetworkIds) && lockedNetworkIds.length === 1) ||
			nonNullish($selectedNetwork)
		);
	});

	const onTokenButtonClick = (token: Token) => {
		onSendToken(token);
	};
</script>

<ModalTokensList {networkSelectorViewOnly} {onSelectNetworkFilter} {onTokenButtonClick}>
	{#snippet topBanner()}
		<ScannedPlainAddressNotice variant={noticeVariant} />
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
