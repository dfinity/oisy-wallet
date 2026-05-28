<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ScannedPlainAddressNotice from '$lib/components/send/ScannedPlainAddressNotice.svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import { isNetworkIdBTCMainnet } from '$lib/utils/network.utils';

	interface Props {
		onSendToken: (token: Token) => void;
		onSelectNetworkFilter: () => void;
		allowedNetworkIds?: NetworkId[];
	}

	let { onSendToken, onSelectNetworkFilter, allowedNetworkIds }: Props = $props();

	let lockedSingleToken = $derived(
		nonNullish(allowedNetworkIds) &&
			allowedNetworkIds.length === 1 &&
			isNetworkIdBTCMainnet(allowedNetworkIds[0])
	);

	// Auto-lock when exactly one network is allowed (nothing to drill into); leave the
	// picker interactive when multiple networks are allowed so the user can narrow further,
	// or when no restriction is set (Chain Fusion default).
	let networkSelectorViewOnly = $derived(
		nonNullish(allowedNetworkIds) && allowedNetworkIds.length === 1
	);

	const onTokenButtonClick = (token: Token) => {
		onSendToken(token);
	};
</script>

<ModalTokensList {networkSelectorViewOnly} {onSelectNetworkFilter} {onTokenButtonClick}>
	{#snippet topBanner()}
		<ScannedPlainAddressNotice singleToken={lockedSingleToken} />
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
