<script lang="ts">
	import { tokenCkBtcLedger } from '$icp/derived/ic-token.derived';
	import InfoBitcoin from '$icp/components/info/InfoBitcoin.svelte';
	import { IconClose } from '@dfinity/gix-components';
	import { hideBitcoinInfo } from '$icp/utils/ck.utils';
	import { slide } from 'svelte/transition';

	let ckBTC = false;
	$: ckBTC = $tokenCkBtcLedger;

	let hideInfo = hideBitcoinInfo();

	const close = () => {
		hideInfo = true;
	};
</script>

{#if ckBTC && !hideInfo}
	<div
		class="border-2 border-dust bg-white rounded-lg mb-12 py-4 px-6 relative"
		transition:slide={{ axis: 'y' }}
	>
		<button class="text absolute top-2 right-2" on:click={close}><IconClose size="24px" /></button>

		<InfoBitcoin />
	</div>
{/if}
