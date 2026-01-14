<script lang="ts">
	import OnramperWidget from '$lib/components/onramper/OnramperWidget.svelte';
</script>

<div class="stretch flex overflow-hidden">
	<div class="w-full overflow-auto">
		<OnramperWidget />
	</div>
</div>

<style lang="scss">
	.stretch {
		--stretch-padding-bottom: var(--padding-3x);
	}
</style>
