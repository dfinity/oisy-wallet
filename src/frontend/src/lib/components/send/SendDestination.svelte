<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { TargetNetwork } from '$lib/enums/network';

	export let destination = '';
	export let network: TargetNetwork | undefined = undefined;
</script>

<label for="destination" class="font-bold px-1.25">Destination:</label>
<Input
	name="destination"
	inputType="text"
	required
	bind:value={destination}
	placeholder={network === TargetNetwork.ICP
		? 'Enter ICP account identifier'
		: 'Enter public address (0x)'}
/>
