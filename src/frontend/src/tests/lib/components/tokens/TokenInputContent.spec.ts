import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import TokenInputContent from '$lib/components/tokens/TokenInputContent.svelte';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('TokenInputContent', () => {
	const props = {
		token: ICP_TOKEN,
		amount: '1',
		amountInfo: mockSnippet,
		balance: mockSnippet
	};

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('checks the amount once typing pauses', async () => {
		const onCustomValidate = vi.fn();

		render(TokenInputContent, { props: { ...props, onCustomValidate } });

		expect(onCustomValidate).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(300);

		expect(onCustomValidate).toHaveBeenCalledOnce();
	});

	it('drops a pending check when the input goes away', async () => {
		const onCustomValidate = vi.fn();

		const { unmount } = render(TokenInputContent, { props: { ...props, onCustomValidate } });

		unmount();

		await vi.advanceTimersByTimeAsync(300);

		expect(onCustomValidate).not.toHaveBeenCalled();
	});
});
