<script lang="ts">
	import { IconInfo } from '@dfinity/gix-components';
</script>

<div class="bg-dark-blue text-off-white rounded-lg p-4 mb-4 flex gap-4 items-center">
	<div class="min-w-5">
		<IconInfo size="20px" />
	</div>
	<div>
		<slot />
	</div>
</div>
