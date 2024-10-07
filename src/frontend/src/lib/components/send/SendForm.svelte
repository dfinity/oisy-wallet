<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';

	export let source: string;

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<ContentWithToolbar>
		<slot name="destination" />

		<slot name="amount" />

		<SendSource token={$token} balance={$balance} {source} />

		<slot name="fee" />

		<ButtonGroup slot="toolbar">
			<slot name="cancel" />

			<button class="primary block flex-1" type="submit" disabled={false}>
				{$i18n.core.text.next}
			</button>
		</ButtonGroup>
	</ContentWithToolbar>
</form>
