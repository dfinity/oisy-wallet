<div class="flex flex-col items-start justify-between md:flex-row">
	<div
		class="mb-3 flex h-14 w-full items-center rounded-lg border border-disabled bg-secondary px-3 md:mb-0 md:w-[35%]"
	>
		<slot name="token-info" />
	</div>
	<div class="w-full md:w-[62%]">
		<slot name="amount" />

		<div class="mt-2 flex items-center justify-between">
			<div class="text-tertiary"><slot name="amount-info" /></div>
			<div class="text-sm font-semibold">
				<slot name="balance" />
			</div>
		</div>
	</div>
</div>
