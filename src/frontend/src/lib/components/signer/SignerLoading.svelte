<script lang="ts">
	import { Spinner } from '@dfinity/gix-components';
</script>

<div class="min-h-64 flex flex-col justify-center items-center gap-3">
	<div class="text-[var(--color-primary)]">
		<Spinner inline />
	</div>
	<span class="text-sm"><slot /></span>
</div>
