<script lang="ts">
	import { ONRAMPER_ENABLED } from '$env/rest/onramper.env';
	import BuyUnavailableNotice from '$lib/components/buy/BuyUnavailableNotice.svelte';
	import OnramperWidget from '$lib/components/onramper/OnramperWidget.svelte';

	// DEMO BRANCH — NOT FOR MERGE: the runtime `onramper_enabled` backend check (which requires the
	// signing secret to be provisioned) is intentionally dropped here so the widget opens on the
	// build-time flag alone. `signed` selects between the production signed URL and the unsigned one.
	let { signed = false }: { signed?: boolean } = $props();
</script>

{#if ONRAMPER_ENABLED}
	<div class="stretch flex overflow-hidden">
		<div class="w-full overflow-auto">
			<OnramperWidget {signed} />
		</div>
	</div>
{:else}
	<BuyUnavailableNotice />
{/if}

<style lang="scss">
	.stretch {
		--stretch-padding-bottom: var(--padding-3x);
	}
</style>
