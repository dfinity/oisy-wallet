<script lang="ts">
	import { IconWarning } from '@dfinity/gix-components';
</script>

<div class="mb-4 flex gap-4 rounded-lg bg-dark-blue p-4 text-off-white">
	<div style="min-width: 44px" class="text-goldenrod">
		<IconWarning size="44px" />
	</div>
	<div>
		<slot />
	</div>
</div>
