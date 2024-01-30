<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { isBusy } from '$lib/derived/busy.derived';
	import { token, tokenStandard } from '$lib/derived/token.derived';
	import { modalIcpReceive, modalReceive } from '$lib/derived/modal.derived';
	import IcReceiveModal from '$icp/components/receive/IcReceiveModal.svelte';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { isRouteTokens } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import { tokenCkBtcLedger } from '$icp/derived/ic-token.derived';
	import { loadBtcAddress } from '$icp/services/ckbtc.services';
	import type { IcToken } from '$icp/types/ic';
	import { authStore } from '$lib/stores/auth.store';

	const openReceive = async () => {
		if ($tokenStandard === 'icp' || isRouteTokens($page)) {
			modalStore.openIcpReceive();
			return;
		}

		if ($tokenCkBtcLedger) {
			await loadBtcAddress({
				...($token as IcToken),
				identity: $authStore.identity
			});
		}

		modalStore.openReceive();
	};
</script>

<button
	class="flex-1 hero"
	disabled={$isBusy}
	class:opacity-50={$isBusy}
	on:click={async () => await openReceive()}
>
	<IconReceive size="28" />
	<span>Receive</span></button
>

{#if $modalIcpReceive}
	<IcReceiveModal />
{:else if $modalReceive}
	<ReceiveModal />
{/if}
