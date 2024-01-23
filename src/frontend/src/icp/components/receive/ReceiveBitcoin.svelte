<script lang="ts">
	import { isNetworkUsingCkBtcLedger } from '$icp/utils/ic-send.utils';
	import type { IcToken } from '$icp/types/ic';
	import { token } from '$lib/derived/token.derived';

	let ckBTC = false;
	$: ckBTC = isNetworkUsingCkBtcLedger($token as IcToken);
</script>

{#if ckBTC}
	<!-- TODO -->
{/if}
