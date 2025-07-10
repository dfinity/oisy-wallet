<script lang="ts">
	import DappsCarousel from '$lib/components/dapps/DappsCarousel.svelte';
	import Tokens from '$lib/components/tokens/Tokens.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
</script>

<Responsive down="xl">
<div class="mb-6 flex justify-center xl:hidden">
	<DappsCarousel />
</div>
</Responsive>

<Tokens />
