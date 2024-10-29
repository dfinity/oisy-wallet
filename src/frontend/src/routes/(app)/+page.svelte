<script lang="ts">
	import { fade } from 'svelte/transition';
	import DappsCarousel from '$lib/components/dapps/DappsCarousel.svelte';
	import Tokens from '$lib/components/tokens/Tokens.svelte';
</script>

<div transition:fade class="mb-6 flex justify-center xl:hidden">
	<DappsCarousel />
</div>

<Tokens />
