<script lang="ts">
	import DappsCarousel from '$lib/components/dapps/DappsCarousel.svelte';
	import Assets from '$lib/components/tokens/Assets.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { TokenTypes } from '$lib/enums/token-types';
</script>

<Responsive down="xl">
	<div class="mb-6 flex justify-center xl:hidden">
		<DappsCarousel />
	</div>
</Responsive>

<Assets tab={TokenTypes.NFTS} />
