<script lang="ts">
	import { BACKEND_ONRAMPER_ENABLED, ONRAMPER_ENABLED } from '$env/rest/onramper.env';
	import BuyUnavailableNotice from '$lib/components/buy/BuyUnavailableNotice.svelte';
	import OnramperWidget from '$lib/components/onramper/OnramperWidget.svelte';
	import { loadBackendOnramperEnabled } from '$lib/services/backend-onramper-enabled.services';

	// Whether the backend has the OnRamper signing secret provisioned. Resolved at runtime so a
	// missing secret shows the unavailable notice up front instead of a widget that fails on open.
	let backendOnramperEnabled = $state<boolean>(BACKEND_ONRAMPER_ENABLED);

	$effect(() => {
		// Skip the backend round-trip entirely when the build-time flag already hides the widget.
		if (!ONRAMPER_ENABLED) {
			return;
		}

		void loadBackendOnramperEnabled().then((enabled) => {
			backendOnramperEnabled = enabled;
		});
	});
</script>

{#if ONRAMPER_ENABLED && backendOnramperEnabled}
	<div class="stretch flex overflow-hidden">
		<div class="w-full overflow-auto">
			<OnramperWidget />
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
