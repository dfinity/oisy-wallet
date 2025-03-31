<script lang="ts">
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';

	let loading: boolean;
	$: loading = $erc20UserTokensNotInitialized;
</script>

<ModalTokensList {loading} on:icSelectNetworkFilter>
	<ButtonCloseModal slot="toolbar" />
</ModalTokensList>
