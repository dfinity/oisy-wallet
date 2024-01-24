<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalIcSend } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { loadCkBtcMinterInfo } from '$icp/services/ckbtc.services';
	import { tokenCkBtcLedger } from '$icp/derived/ic-token.derived';
	import { token } from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';

	const openSend = async () => {
		if ($tokenCkBtcLedger) {
			await loadCkBtcMinterInfo($token as IcToken);
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
