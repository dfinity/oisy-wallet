<script lang="ts">
	import DappsCarousel from '$lib/components/dapps/DappsCarousel.svelte';
	import Assets from '$lib/components/tokens/Assets.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
</script>

<Responsive down="xl">
	<DappsCarousel wrapperStyleClass="mb-6 flex justify-center xl:hidden" />
</Responsive>

<Assets />
