<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionToken } from '$lib/types/token';

	export let source: string;
	export let disabled: boolean | undefined = false;
	export let token: OptionToken;
	export let balance: OptionBalance;

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<ContentWithToolbar>
		<slot name="destination" />

		<slot name="amount" />

		<SendSource {token} {balance} {source} />

		<slot name="fee" />

		<ButtonGroup slot="toolbar">
			<slot name="cancel" />

			<Button {disabled}>
				{$i18n.core.text.next}
			</Button>
		</ButtonGroup>
	</ContentWithToolbar>
</form>
