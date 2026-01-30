import MediaDisplayGuard from '$lib/components/guard/MediaDisplayGuard.svelte';
import {
	NFT_PLACEHOLDER_FILESIZE,
	NFT_PLACEHOLDER_INVALID,
	NFT_PLACEHOLDER_UNSUPPORTED
} from '$lib/constants/test-ids.constants';
import { MediaStatusEnum } from '$lib/enums/media-status';
import { i18n } from '$lib/stores/i18n.store';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('MediaDisplayGuard', () => {
	const mockOnConsentReview = vi.fn();
	const params = {
		type: 'card' as const,
		mediaStatus: MediaStatusEnum.OK,
		showMessage: true,
		onConsentReview: mockOnConsentReview,
		children: mockSnippet
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the review consent when hasConsent is undefined', () => {
		const { getByRole, getByText } = render(MediaDisplayGuard, {
			...params,
			showMessage: true
		});

		const text = getByText(get(i18n).nfts.text.img_consent_none);

		assertNonNullish(text);

		const btn = getByRole('button');

		assertNonNullish(btn);

		expect(text).toBeInTheDocument();
		expect(btn).toBeInTheDocument();
	});

	it('should render the review consent with a different text when hasConsent is false', () => {
		const { getByRole, getByText } = render(MediaDisplayGuard, {
			...params,
			hasConsent: false
		});

		const text = getByText(get(i18n).nfts.text.img_consent_disabled);

		assertNonNullish(text);

		const btn = getByRole('button');

		assertNonNullish(btn);

		expect(text).toBeInTheDocument();
		expect(btn).toBeInTheDocument();
	});

	it('should trigger onConsentReview when review is clicked', () => {
		const { getByRole } = render(MediaDisplayGuard, params);

		const btn = getByRole('button');
		assertNonNullish(btn);

		expect(btn).toBeInTheDocument();

		fireEvent.click(btn);

		expect(mockOnConsentReview).toHaveBeenCalledOnce();
	});

	it('should render the children if hasConsent is true', () => {
		const { queryAllByRole, queryByText, getByTestId } = render(MediaDisplayGuard, {
			...params,
			hasConsent: true
		});

		expect(queryByText(get(i18n).nfts.text.img_consent_none)).not.toBeInTheDocument();
		expect(queryByText(get(i18n).nfts.text.img_consent_disabled)).not.toBeInTheDocument();

		expect(queryAllByRole('button')).toHaveLength(0);

		const children = getByTestId(mockSnippetTestId);

		expect(children).toBeInTheDocument();
	});

	it('should not show the text and button if showMessage is false', () => {
		const { queryAllByRole, queryByText } = render(MediaDisplayGuard, {
			...params,
			hasConsent: false,
			showMessage: false
		});

		expect(queryByText(get(i18n).nfts.text.img_consent_none)).not.toBeInTheDocument();
		expect(queryByText(get(i18n).nfts.text.img_consent_disabled)).not.toBeInTheDocument();

		expect(queryAllByRole('button')).toHaveLength(0);
	});

	it('should render the different placeholders if mediaStatus is INVALID_DATA', () => {
		const { getByTestId } = render(MediaDisplayGuard, {
			...params,
			hasConsent: true,
			showMessage: false,
			mediaStatus: MediaStatusEnum.INVALID_DATA
		});

		const placeholder = getByTestId(NFT_PLACEHOLDER_INVALID);

		expect(placeholder).toBeInTheDocument();
	});

	it('should render the different placeholders if mediaStatus is FILESIZE_LIMIT_EXCEEDED', () => {
		const { getByTestId } = render(MediaDisplayGuard, {
			...params,
			hasConsent: true,
			showMessage: false,
			mediaStatus: MediaStatusEnum.FILESIZE_LIMIT_EXCEEDED
		});

		const placeholder = getByTestId(NFT_PLACEHOLDER_FILESIZE);

		expect(placeholder).toBeInTheDocument();
	});

	it('should render the different placeholders if mediaStatus is NON_SUPPORTED_MEDIA_TYPE', () => {
		const { getByTestId } = render(MediaDisplayGuard, {
			...params,
			hasConsent: true,
			showMessage: false,
			mediaStatus: MediaStatusEnum.NON_SUPPORTED_MEDIA_TYPE
		});

		const placeholder = getByTestId(NFT_PLACEHOLDER_UNSUPPORTED);

		expect(placeholder).toBeInTheDocument();
	});
});
