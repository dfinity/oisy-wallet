<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { initBtcStatusesWorker } from '$icp/services/worker.btc-statuses.services';
	import { initCkBTCMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import type { OptionToken, Token } from '$lib/types/token';

	interface Props {
		token: OptionToken;
		children?: Snippet;
	}

	let { token, children }: Props = $props();
	let minterInfoLoaded: boolean = $derived(
		nonNullish(token?.id) && $ckBtcMinterInfoStore?.[token.id]?.certified === true
	);
	let twinToken: Token | undefined = $derived((token as OptionIcCkToken)?.twinToken);
</script>

{#if nonNullish(token)}
	<IcCkListener initFn={initBtcStatusesWorker} {token} {twinToken} />

	{#if !minterInfoLoaded}
		<IcCkListener initFn={initCkBTCMinterInfoWorker} {token} {twinToken} />
	{/if}
{/if}

{@render children?.()}
