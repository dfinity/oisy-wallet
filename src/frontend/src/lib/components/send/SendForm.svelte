<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonNext from '$lib/components/ui/ButtonNext.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
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

			<ButtonNext {disabled} />
		</ButtonGroup>
	</ContentWithToolbar>
</form>
