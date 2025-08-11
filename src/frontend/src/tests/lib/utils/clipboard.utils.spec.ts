import * as toastsStore from '$lib/stores/toasts.store';
import { copyToClipboard } from '$lib/utils/clipboard.utils';
import { copyText } from '$lib/utils/share.utils';
import type { MockInstance } from 'vitest';

vi.mock('$lib/utils/share.utils', () => ({
	copyText: vi.fn()
}));

describe('clipboard.utils', () => {
	describe('copyToClipboard', () => {
		let spyToastsShow: MockInstance;

		const mockCopyText = vi.mocked(copyText);

		const text = 'Copied!';
		const value = 'text to copy';

		beforeEach(() => {
			vi.resetAllMocks();

			spyToastsShow = vi.spyOn(toastsStore, 'toastsShow');

			mockCopyText.mockResolvedValue(undefined);
		});

		it('should copy text to clipboard', async () => {
			await copyToClipboard({ value, text });

			expect(mockCopyText).toHaveBeenCalledOnce();
			expect(mockCopyText).toHaveBeenCalledWith(value);
		});

		it('should show a success toast if copy is successful', async () => {
			await copyToClipboard({ value, text });

			expect(spyToastsShow).toHaveBeenCalledWith({
				text,
				level: 'success',
				duration: 2000
			});
		});

		it('should handle empty string', async () => {
			await copyToClipboard({ value: '', text });

			expect(spyToastsShow).toHaveBeenCalledWith({
				text,
				level: 'success',
				duration: 2000
			});
		});
	});
});
