<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { mapAddressStartsWith0x } from '$lib/utils/send.utils';
	import { isNullish } from '@dfinity/utils';

	export let destination = '';

	const onBlur = () => {
		if (destination === '' || isNullish(destination)) {
			return;
		}

		destination = mapAddressStartsWith0x(destination);
	};
</script>

<label for="destination" class="font-bold px-1.25">Destination:</label>
<Input
	name="destination"
	inputType="text"
	required
	bind:value={destination}
	placeholder="Enter public address (0x)"
	on:blur={onBlur}
/>
