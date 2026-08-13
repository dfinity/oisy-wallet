<script lang="ts">
	import { ONRAMPER_ENABLED } from '$env/rest/onramper.env';
	import BuyUnavailableNotice from '$lib/components/buy/BuyUnavailableNotice.svelte';
	import OnramperWidget from '$lib/components/onramper/OnramperWidget.svelte';
</script>

{#if ONRAMPER_ENABLED}
	<div class="stretch flex overflow-hidden">
		<div class="w-full overflow-auto">
			<OnramperWidget />
		</div>
	</div>
{:else}
	<BuyUnavailableNotice reason="disabled" />
{/if}

<style lang="scss">
	.stretch {
		--stretch-padding-bottom: var(--padding-3x);
	}
</style>
