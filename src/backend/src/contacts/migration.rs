//! Moves contact images still held inline in the contact blob into `contact_image`.
//!
//! Contacts written before images got their own map keep their image inline until they are next
//! written. This migration moves those images in timer batches after an upgrade, so that every
//! image is read from `contact_image`. An inline image that fails `Validate` already decodes as
//! absent (see `Contact::image` in `shared::types::contact`), so it is not moved.
//!
//! TODO: remove this module and its start in `post_upgrade` once every canister has been upgraded
//! past the release that ships it.

use std::{ops::Bound, time::Duration};

use ic_cdk_timers::set_timer;

use crate::{
    state::{mutate_state, State},
    types::{storable::ContactImageKey, Candid, StoredPrincipal},
};

/// Instructions a batch may use before the remaining principals wait for the next batch.
///
/// A timer message may use 40B instructions. Migrating a principal decodes its contact blob twice
/// (the read, and the write that replaces it), so any blob that `get_contacts` can still read, as
/// a query limited to 5B instructions, fits in the headroom above this budget.
const BATCH_INSTRUCTION_BUDGET: u64 = 2_000_000_000;

/// Pause between batches, so that the migration leaves room for other messages.
const BATCH_INTERVAL: Duration = Duration::from_secs(1);

/// Starts the migration from the first principal.
pub(crate) fn start_inline_image_migration() {
    schedule_batch(None, 0);
}

fn schedule_batch(after: Option<StoredPrincipal>, moved_so_far: usize) {
    let delay = if after.is_none() {
        Duration::ZERO
    } else {
        BATCH_INTERVAL
    };

    set_timer(delay, async move {
        let (next, moved) = mutate_state(|s| {
            migrate_batch(s, after, || {
                ic_cdk::api::instruction_counter() < BATCH_INSTRUCTION_BUDGET
            })
        });
        let moved_so_far = moved_so_far + moved;

        match next {
            Some(after) => schedule_batch(Some(after), moved_so_far),
            None => ic_cdk::println!("Moved {moved_so_far} inline contact images to contact_image"),
        }
    });
}

/// Migrates the principals that come after `after`, one at a time, for as long as `within_budget`
/// holds, and always at least one, so that every batch makes progress.
///
/// Returns the last principal migrated while principals remain, or `None` once all of them are
/// done, together with the number of images moved.
fn migrate_batch(
    s: &mut State,
    mut after: Option<StoredPrincipal>,
    mut within_budget: impl FnMut() -> bool,
) -> (Option<StoredPrincipal>, usize) {
    let mut moved = 0;

    loop {
        let next = match after {
            Some(after) => s
                .contact
                .keys_range((Bound::Excluded(after), Bound::Unbounded))
                .next(),
            None => s.contact.keys().next(),
        };
        let Some(principal) = next else {
            return (None, moved);
        };

        moved += move_inline_images(s, principal);
        after = Some(principal);

        if !within_budget() {
            return (after, moved);
        }
    }
}

/// Moves the principal's inline images into `contact_image` and writes the contact blob back
/// without them. A principal with no inline image is left as it is.
fn move_inline_images(s: &mut State, principal: StoredPrincipal) -> usize {
    let Some(Candid(mut stored_contacts)) = s.contact.get(&principal) else {
        return 0;
    };

    let mut moved = 0;
    for contact in stored_contacts.contacts.values_mut() {
        if let Some(image) = contact.image.take() {
            s.contact_image
                .insert(ContactImageKey(principal, contact.id), Candid(image));
            moved += 1;
        }
    }

    if moved > 0 {
        s.contact.insert(principal, Candid(stored_contacts));
    }

    moved
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use candid::Principal;
    use pretty_assertions::assert_eq;
    use serde_bytes::ByteBuf;
    use shared::types::contact::{
        Contact, ContactImage, ImageMimeType, StoredContacts, MAX_IMAGE_SIZE_BYTES,
    };

    use super::*;
    use crate::state::read_state;

    fn principal(seed: u8) -> StoredPrincipal {
        StoredPrincipal(Principal::from_slice(&[seed]))
    }

    fn image(size: usize) -> ContactImage {
        ContactImage {
            data: ByteBuf::from(vec![1u8; size]),
            mime_type: ImageMimeType::Png,
        }
    }

    fn contact(id: u64, image: Option<ContactImage>) -> Contact {
        Contact {
            id,
            name: format!("Contact {id}"),
            addresses: vec![],
            update_timestamp_ns: 1,
            image,
        }
    }

    /// Writes the principal's contacts as a contact written before images got their own map:
    /// encoding does not validate, so an image over the limit is stored as given.
    fn store_inline(principal: StoredPrincipal, contacts: Vec<Contact>) {
        let stored_contacts = StoredContacts {
            contacts: contacts.into_iter().map(|c| (c.id, c)).collect(),
            update_timestamp_ns: 1,
        };
        mutate_state(|s| {
            s.contact.insert(principal, Candid(stored_contacts));
        });
    }

    fn stored(principal: StoredPrincipal) -> BTreeMap<u64, Contact> {
        read_state(|s| {
            s.contact
                .get(&principal)
                .map(|stored_contacts| stored_contacts.0.contacts)
                .unwrap_or_default()
        })
    }

    fn mapped_image(principal: StoredPrincipal, contact_id: u64) -> Option<ContactImage> {
        read_state(|s| {
            s.contact_image
                .get(&ContactImageKey(principal, contact_id))
                .map(|image| image.0)
        })
    }

    #[test]
    fn moves_inline_images_to_the_image_map() {
        let p = principal(1);
        store_inline(p, vec![contact(1, Some(image(10))), contact(2, None)]);

        let result = mutate_state(|s| migrate_batch(s, None, || true));

        assert_eq!(result, (None, 1));
        assert_eq!(
            stored(p),
            BTreeMap::from([(1, contact(1, None)), (2, contact(2, None))])
        );
        assert_eq!(mapped_image(p, 1), Some(image(10)));
        assert_eq!(mapped_image(p, 2), None);
    }

    #[test]
    fn does_not_move_an_inline_image_that_fails_validation() {
        let p = principal(1);
        store_inline(
            p,
            vec![
                contact(1, Some(image(MAX_IMAGE_SIZE_BYTES + 1))),
                contact(2, Some(image(10))),
            ],
        );

        let result = mutate_state(|s| migrate_batch(s, None, || true));

        assert_eq!(result, (None, 1));
        assert_eq!(
            stored(p),
            BTreeMap::from([(1, contact(1, None)), (2, contact(2, None))])
        );
        assert_eq!(mapped_image(p, 1), None);
        assert_eq!(mapped_image(p, 2), Some(image(10)));
    }

    #[test]
    fn keeps_images_already_in_the_image_map() {
        let p = principal(1);
        store_inline(p, vec![contact(1, None)]);
        mutate_state(|s| {
            s.contact_image
                .insert(ContactImageKey(p, 1), Candid(image(10)));
        });

        let result = mutate_state(|s| migrate_batch(s, None, || true));

        assert_eq!(result, (None, 0));
        assert_eq!(stored(p), BTreeMap::from([(1, contact(1, None))]));
        assert_eq!(mapped_image(p, 1), Some(image(10)));
    }

    #[test]
    fn resumes_after_the_last_principal_of_a_batch() {
        let principals = [principal(1), principal(2), principal(3)];
        for p in principals {
            store_inline(p, vec![contact(1, Some(image(10)))]);
        }

        // A spent budget still migrates one principal per batch.
        let mut after = None;
        let mut batches = 0;
        let mut moved = 0;
        loop {
            let (next, batch_moved) = mutate_state(|s| migrate_batch(s, after, || false));
            batches += 1;
            moved += batch_moved;
            match next {
                Some(next) => after = Some(next),
                None => break,
            }
        }

        assert_eq!((batches, moved), (4, 3));
        for p in principals {
            assert_eq!(stored(p), BTreeMap::from([(1, contact(1, None))]));
            assert_eq!(mapped_image(p, 1), Some(image(10)));
        }
    }

    #[test]
    fn running_again_moves_nothing() {
        let p = principal(1);
        store_inline(p, vec![contact(1, Some(image(10)))]);
        mutate_state(|s| migrate_batch(s, None, || true));

        let result = mutate_state(|s| migrate_batch(s, None, || true));

        assert_eq!(result, (None, 0));
        assert_eq!(stored(p), BTreeMap::from([(1, contact(1, None))]));
        assert_eq!(mapped_image(p, 1), Some(image(10)));
    }
}
