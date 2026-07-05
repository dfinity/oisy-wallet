import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import {
	trackNoteShare,
	trackPersonalNote,
	type NoteShareStep,
	type PersonalNoteStep
} from '$lib/services/personal-notes-analytics.services';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('personal-notes-analytics.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('trackPersonalNote', () => {
		it('tracks a successful create with context, modifier, source and status', () => {
			trackPersonalNote({
				step: 'create',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'personal_note',
				metadata: {
					event_context: 'personal_notes',
					event_modifier: 'create',
					source_location: 'notes',
					result_status: 'success'
				}
			});
		});

		it('adds event_value first_note only on the first successful create', () => {
			trackPersonalNote({
				step: 'create',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				isFirstNote: true
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'personal_note',
				metadata: {
					event_context: 'personal_notes',
					event_modifier: 'create',
					source_location: 'notes',
					result_status: 'success',
					event_value: 'first_note'
				}
			});
		});

		it('omits first_note when isFirstNote is false', () => {
			trackPersonalNote({
				step: 'create',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				isFirstNote: false
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'personal_note',
				metadata: {
					event_context: 'personal_notes',
					event_modifier: 'create',
					source_location: 'notes',
					result_status: 'success'
				}
			});
		});

		it.each<PersonalNoteStep>(['edit', 'delete', 'open'])(
			'maps the %s step onto event_modifier',
			(step) => {
				trackPersonalNote({ step, resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS });

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: 'personal_note',
					metadata: {
						event_context: 'personal_notes',
						event_modifier: step,
						source_location: 'notes',
						result_status: 'success'
					}
				});
			}
		);

		it('carries a sanitized error string on failure', () => {
			trackPersonalNote({
				step: 'create',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				error: 'save failed'
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'personal_note',
				metadata: {
					event_context: 'personal_notes',
					event_modifier: 'create',
					source_location: 'notes',
					result_status: 'error',
					result_error: 'save failed'
				}
			});
		});

		it('omits an empty error string', () => {
			trackPersonalNote({
				step: 'delete',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				error: ''
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'personal_note',
				metadata: {
					event_context: 'personal_notes',
					event_modifier: 'delete',
					source_location: 'notes',
					result_status: 'error'
				}
			});
		});

		it('never emits the note text, a note id, or any key beyond the fixed schema', () => {
			trackPersonalNote({
				step: 'edit',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				isFirstNote: true,
				error: 'boom'
			});

			const [[{ metadata }]] = vi.mocked(trackEvent).mock.calls;

			// Even the maximal payload stays within the fixed schema — nothing
			// note-specific (content, id, token, key) can appear.
			expect(Object.keys(metadata ?? {}).sort()).toEqual(
				[
					'event_context',
					'event_modifier',
					'event_value',
					'result_error',
					'result_status',
					'source_location'
				].sort()
			);
		});
	});

	describe('trackNoteShare', () => {
		it('tracks the creator dialog open on the share_dialog source', () => {
			trackNoteShare({ step: 'open', side: 'creator' });

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'note_share',
				metadata: {
					event_context: 'personal_notes',
					event_subcontext: 'share',
					event_modifier: 'open',
					source_location: 'share_dialog'
				}
			});
		});

		it('tracks a successful create with single_use, expiry and status', () => {
			trackNoteShare({
				step: 'create',
				side: 'creator',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				singleUse: false,
				expiry: '7d'
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'note_share',
				metadata: {
					event_context: 'personal_notes',
					event_subcontext: 'share',
					event_modifier: 'create',
					source_location: 'share_dialog',
					result_status: 'success',
					single_use: 'false',
					expiry: '7d'
				}
			});
		});

		it('tracks a create error with a sanitized error string', () => {
			trackNoteShare({
				step: 'create',
				side: 'creator',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				singleUse: true,
				expiry: '1h',
				error: 'boom'
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'note_share',
				metadata: {
					event_context: 'personal_notes',
					event_subcontext: 'share',
					event_modifier: 'create',
					source_location: 'share_dialog',
					result_status: 'error',
					single_use: 'true',
					expiry: '1h',
					result_error: 'boom'
				}
			});
		});

		it('emits single_use on a recipient reveal', () => {
			trackNoteShare({ step: 'reveal', side: 'recipient', singleUse: true });

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'note_share',
				metadata: {
					event_context: 'personal_notes',
					event_subcontext: 'share',
					event_modifier: 'reveal',
					source_location: 'recipient_page',
					single_use: 'true'
				}
			});
		});

		it('emits source_detail on a recipient discover', () => {
			trackNoteShare({ step: 'discover', side: 'recipient', sourceDetail: 'outro' });

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'note_share',
				metadata: {
					event_context: 'personal_notes',
					event_subcontext: 'share',
					event_modifier: 'discover',
					source_location: 'recipient_page',
					source_detail: 'outro'
				}
			});
		});

		it.each<NoteShareStep>(['view', 'copy', 'close', 'unavailable'])(
			'maps the bare recipient %s step with no extra properties',
			(step) => {
				trackNoteShare({ step, side: 'recipient' });

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: 'note_share',
					metadata: {
						event_context: 'personal_notes',
						event_subcontext: 'share',
						event_modifier: step,
						source_location: 'recipient_page'
					}
				});
			}
		);

		it('omits optional fields when nullish or empty', () => {
			trackNoteShare({
				step: 'create',
				side: 'creator',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				expiry: '',
				sourceDetail: '',
				error: ''
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'note_share',
				metadata: {
					event_context: 'personal_notes',
					event_subcontext: 'share',
					event_modifier: 'create',
					source_location: 'share_dialog',
					result_status: 'success'
				}
			});
		});

		it('never emits a token, key, note text, or any key beyond the fixed schema', () => {
			trackNoteShare({
				step: 'create',
				side: 'creator',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				singleUse: true,
				expiry: '30d',
				sourceDetail: 'outro',
				error: 'boom'
			});

			const [[{ metadata }]] = vi.mocked(trackEvent).mock.calls;

			expect(Object.keys(metadata ?? {}).sort()).toEqual(
				[
					'event_context',
					'event_subcontext',
					'event_modifier',
					'source_location',
					'result_status',
					'single_use',
					'expiry',
					'source_detail',
					'result_error'
				].sort()
			);
		});
	});
});
