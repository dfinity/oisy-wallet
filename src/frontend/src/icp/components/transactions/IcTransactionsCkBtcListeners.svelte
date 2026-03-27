<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { BtcStatusesWorker } from '$icp/services/worker.btc-statuses.services';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import type { OptionToken, Token } from '$lib/types/token';

	interface Props {
		token: OptionToken;
		children?: Snippet;
	}

	let { token, children }: Props = $props();

	let twinToken: Token | undefined = $derived((token as OptionIcCkToken)?.twinToken);
</script>

{#if nonNullish(token)}
	<IcCkListener initFn={BtcStatusesWorker.init} {token} {twinToken} />
{/if}

{@render children?.()}
