<script lang="ts">
	import { IconWarning } from '@dfinity/gix-components';
</script>

<div class="bg-dark-blue text-off-white rounded-lg p-4 mb-4 flex gap-4">
	<div style="min-width: 44px" class="text-goldenrod">
		<IconWarning size="44px" />
	</div>
	<div>
		<slot />
	</div>
</div>
