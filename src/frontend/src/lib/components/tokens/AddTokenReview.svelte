<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

    export let contractAddress = '';

	let invalid = true;
	$: invalid = isNullishOrEmpty(contractAddress);

	const dispatch = createEventDispatcher();
</script>

<label for="contractAddress" class="font-bold px-1.25">Contract address:</label>
<div id="contractAddress" class="font-normal mb-2 px-1.25 break-words">{contractAddress}</div>

<p class="mt-1 mb-4 px-1.25">⚠️ Before manually adding a token, make sure you trust it.</p>

<div class="flex justify-end gap-1">
	<button class="secondary" on:click={() => dispatch('icBack')}>Back</button>
	<button
		class="primary"
		disabled={invalid}
		class:opacity-15={invalid}
		on:click={() => dispatch('icSave')}
	>
		Save
	</button>
</div>
