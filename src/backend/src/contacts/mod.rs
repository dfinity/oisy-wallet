mod migration;
mod service;

pub(crate) use migration::start_inline_image_migration;
pub(crate) use service::{
    create_contact, delete_contact, get_contact, get_contact_images, get_contacts,
    get_contacts_page, update_contact,
};
