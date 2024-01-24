<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalIcSend } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { isNetworkUsingCkBtcLedger } from '$icp/utils/ic-send.utils';
	import { token } from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';
	import { loadCkBtcMinterInfo } from '$icp/services/ckbtc.services';

	const openSend = async () => {
		if (isNetworkUsingCkBtcLedger($token as IcToken)) {
			await loadCkBtcMinterInfo();
		}

		modalStore.openIcSend();
	};
</script>

<button
	class="hero"
	on:click={async () => await openSend()}
	disabled={$isBusy}
	class:opacity-50={$isBusy}
>
	<IconSend size="28" />
	<span>Send</span></button
>

{#if $modalIcSend}
	<IcSendModal />
{/if}
