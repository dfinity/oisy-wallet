import * as toastsStore from '$lib/stores/toasts.store';
import { copyToClipboard } from '$lib/utils/clipboard.utils';
import { copyText } from '$lib/utils/share.utils';
import en from '$tests/mocks/i18n.mock';
import type { MockInstance } from 'vitest';

vi.mock('$lib/utils/share.utils', () => ({
	copyText: vi.fn()
}));

describe('clipboard.utils', () => {
	describe('copyToClipboard', () => {
		let spyToastsShow: MockInstance;
		let spyToastsErrorNoTrace: MockInstance;

		const mockCopyText = vi.mocked(copyText);

		const text = 'Copied!';
		const value = 'text to copy';

		beforeEach(() => {
			vi.resetAllMocks();

			spyToastsShow = vi.spyOn(toastsStore, 'toastsShow');
			spyToastsErrorNoTrace = vi
				.spyOn(toastsStore, 'toastsErrorNoTrace')
				.mockImplementation(() => Symbol('toast'));

			mockCopyText.mockResolvedValue(undefined);
		});

		it('should copy text to clipboard', async () => {
			await copyToClipboard({ value, text });

			expect(mockCopyText).toHaveBeenCalledExactlyOnceWith(value);
		});

		it('should show a success toast if copy is successful', async () => {
			await copyToClipboard({ value, text });

			expect(spyToastsShow).toHaveBeenCalledWith({
				text,
				level: 'success',
				duration: 2000
			});
		});

		it('should return true if copy is successful', async () => {
			await expect(copyToClipboard({ value, text })).resolves.toBeTruthy();
		});

		it('should handle empty string', async () => {
			await copyToClipboard({ value: '', text });

			expect(spyToastsShow).toHaveBeenCalledWith({
				text,
				level: 'success',
				duration: 2000
			});
		});

		describe('when the browser rejects the write', () => {
			const err = new DOMException('Write permission denied.', 'NotAllowedError');

			beforeEach(() => {
				mockCopyText.mockRejectedValue(err);
			});

			it('should not throw and return false', async () => {
				await expect(copyToClipboard({ value, text })).resolves.toBeFalsy();
			});

			it('should show the copy failed error toast', async () => {
				await copyToClipboard({ value, text });

				expect(spyToastsErrorNoTrace).toHaveBeenCalledExactlyOnceWith({
					msg: { text: en.core.error.copy_failed },
					err
				});
			});

			it('should not show the success toast', async () => {
				await copyToClipboard({ value, text });

				expect(spyToastsShow).not.toHaveBeenCalled();
			});
		});
	});
});
