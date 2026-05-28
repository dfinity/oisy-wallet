<script lang="ts">
	import IcIcrc7DeepLinkHandler from '$icp/components/tokens/IcIcrc7DeepLinkHandler.svelte';
	import Assets from '$lib/components/tokens/Assets.svelte';
	import { TokenTypes } from '$lib/enums/token-types';
</script>

<IcIcrc7DeepLinkHandler />

<Assets tab={TokenTypes.NFTS} />
