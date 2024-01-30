<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { isBusy } from '$lib/derived/busy.derived';
	import { token, tokenStandard } from '$lib/derived/token.derived';
	import {
		modalCkBTCReceive,
		modalCkETHReceive,
		modalIcpReceive,
		modalReceive
	} from '$lib/derived/modal.derived';
	import IcReceiveModal from '$icp/components/receive/IcReceiveModal.svelte';
	import { isRouteTokens } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import { tokenCkBtcLedger, tokenCkEthLedger } from '$icp/derived/ic-token.derived';
	import { loadBtcAddress, loadCkBtcMinterInfo } from '$icp/services/ckbtc.services';
	import type { IcToken } from '$icp/types/ic';
	import { authStore } from '$lib/stores/auth.store';
	import IcReceiveInfo from '$icp/components/receive/IcReceiveInfo.svelte';
	import IcReceiveInfoCkBTC from '$icp/components/receive/IcReceiveInfoCkBTC.svelte';
	import IcReceiveInfoCkETH from "$icp/components/receive/IcReceiveInfoCkETH.svelte";

	const openReceive = async () => {
		if ($tokenStandard === 'icp' || isRouteTokens($page)) {
			modalStore.openIcpReceive();
			return;
		}

		if ($tokenCkBtcLedger) {
			await Promise.all([
				loadBtcAddress({
					...($token as IcToken),
					identity: $authStore.identity
				}),
				loadCkBtcMinterInfo($token as IcToken)
			]);

			modalStore.openCkBTCReceive();
			return;
		}

		if ($tokenCkEthLedger) {
			modalStore.openCkETHReceive();
			return;
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
	<IcReceiveModal infoCmp={IcReceiveInfo} />
{:else if $modalCkBTCReceive}
	<IcReceiveModal infoCmp={IcReceiveInfoCkBTC} />
{:else if $modalCkETHReceive}
	<IcReceiveModal infoCmp={IcReceiveInfoCkETH} />
{/if}
