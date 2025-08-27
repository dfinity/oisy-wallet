<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import NetworkSwitcherList from '$lib/components/networks/NetworkSwitcherList.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { networks } from '$lib/derived/networks.derived';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { Network, OptionNetworkId } from '$lib/types/network';

	interface Props {
		allNetworksEnabled?: boolean;
		filteredNetworks?: Network[];
	}

	let { allNetworksEnabled, filteredNetworks }: Props = $props();

	const { setFilterNetwork, filterNetwork } = getContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY
	);

	const dispatch = createEventDispatcher();

	const back = () => dispatch('icNetworkFilter');

	const onNetworkSelect = (networkId: OptionNetworkId) => {
		const network = $networks.find(({ id }) => id === networkId);

		setFilterNetwork(network);

		back();
	};
</script>

<ContentWithToolbar>
	<NetworkSwitcherList
		{allNetworksEnabled}
		delayOnNetworkSelect={false}
		labelsSize="lg"
		onSelected={onNetworkSelect}
		selectedNetworkId={$filterNetwork?.id}
		supportedNetworks={filteredNetworks}
	/>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={back} />
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
