<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import { ZERO_BI } from '$lib/constants/app.constants';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import type { TokenUi } from '$lib/types/token';

	const dispatch = createEventDispatcher();

	let tokens: TokenUi[];
	$: tokens = $combinedDerivedSortedNetworkTokensUi.filter(
		({ balance }) => (balance ?? ZERO_BI) > ZERO_BI
	);

	let loading: boolean;
	$: loading = $erc20UserTokensNotInitialized;

	const onIcTokenButtonClick = ({ detail: token }: CustomEvent<TokenUi>) => {
		dispatch('icSendToken', token);
	};
</script>

<ModalTokensList {tokens} {loading} on:icTokenButtonClick={onIcTokenButtonClick}>
	<ButtonCloseModal slot="toolbar" />
</ModalTokensList>
