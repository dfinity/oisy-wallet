<div class="mb-6 flex gap-3 sm:gap-8">
	<button class="flex-1" on:click>
		<div class="w-full">
			<slot />
		</div>
	</button>

	<slot name="actions" />
</div>
