<script lang="ts">
	import AboutHow from '$lib/components/hero/about/AboutHow.svelte';
	import AboutWhat from '$lib/components/hero/about/AboutWhat.svelte';
</script>

<div class="box-content flex w-full flex-col gap-5 py-3">
	<AboutWhat asMenuItem shortLabel />

	<AboutHow asMenuItem shortLabel />
</div>
