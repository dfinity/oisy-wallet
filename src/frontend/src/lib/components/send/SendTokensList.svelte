<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { SEND_TOKENS_LIST_SCANNED_ADDRESS_NOTICE } from '$lib/constants/test-ids.constants';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';

	interface Props {
		onSendToken: (token: Token) => void;
		onSelectNetworkFilter: () => void;
		lockedNetwork?: Network;
		showScannedAddressNotice?: boolean;
	}

	let {
		onSendToken,
		onSelectNetworkFilter,
		lockedNetwork,
		showScannedAddressNotice = false
	}: Props = $props();

	const onTokenButtonClick = (token: Token) => {
		onSendToken(token);
	};
</script>

<ModalTokensList
	networkSelectorViewOnly={nonNullish(lockedNetwork) || nonNullish($selectedNetwork)}
	{onSelectNetworkFilter}
	{onTokenButtonClick}
>
	{#snippet topBanner()}
		{#if showScannedAddressNotice}
			<MessageBox level="warning" testId={SEND_TOKENS_LIST_SCANNED_ADDRESS_NOTICE}>
				{$i18n.send.info.scanned_address_only_destination}
			</MessageBox>
		{/if}
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
