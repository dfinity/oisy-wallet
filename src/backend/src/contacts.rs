use std::error::Error;


// Import our contact model and repository
use contacts_model::{
    AddressType, Address, Contact, ContactRepository, create_mock_contact_repository
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    println!("Contacts Demo - Rust Implementation");

    // Create a repository instance
    let contact_repo = create_mock_contact_repository();

    // Get all contacts
    println!("\n--- All Contacts ---");
    let all_contacts = contact_repo.get_all().await;
    for contact in &all_contacts {
        println!("{} ({} addresses)", contact.name, contact.addresses.len());
    }

    // Get favorites
    println!("\n--- Favorites ---");
    let favorites = contact_repo.get_favorites().await;
    for contact in favorites {
        println!("{} - Last updated: {}", contact.name, contact.last_updated);
    }

    // Filter by BTC addresses
    println!("\n--- BTC Addresses ---");
    let btc_contacts = contact_repo.filter_by_address_type(&AddressType::BTC).await;
    for contact in btc_contacts {
        println!("{}:", contact.name);
        for addr in contact.addresses.iter().filter(|a| a.address_type == AddressType::BTC) {
            let label = addr.label.as_deref().unwrap_or("Unlabeled");
            let default_marker = if addr.is_default { " (default)" } else { "" };
            println!("  - {}: {}{}", label, addr.address, default_marker);
        }
    }

    // Search by name
    println!("\n--- Search for 'a' ---");
    let search_results = contact_repo.search_by_name("a").await;
    for contact in search_results {
        println!("{}", contact.name);
    }

    // Add a new contact
    println!("\n--- Add New Contact ---");
    let new_contact = Contact {
        id: String::new(), // Will be assigned by the repository
        name: "Frank Miller".to_string(),
        avatar: None, // Will be generated based on name
        addresses: vec![
            Address {
                address_type: AddressType::ETH,
                address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F".to_string(),
                label: Some("Main Wallet".to_string()),
                is_default: true,
            }
        ],
        notes: Some("Met at Ethereum conference".to_string()),
        is_favorite: false,
        last_updated: Utc::now(),
    };

    let saved_contact = contact_repo.save(new_contact).await;
    println!("Added: {} with ID: {}", saved_contact.name, saved_contact.id);

    // Get contact details
    println!("\n--- Get Contact Details ---");
    if let Some(contact_details) = contact_repo.get_by_id("1").await {
        println!("{}:", contact_details.name);
        println!("Avatar: {}", contact_details.avatar.unwrap_or_else(|| "None".to_string()));
        println!("Notes: {}", contact_details.notes.unwrap_or_else(|| "None".to_string()));
        println!("Addresses:");
        for addr in contact_details.addresses {
            let addr_type = format!("{:?}", addr.address_type);
            let label = addr.label.unwrap_or_else(|| "No label".to_string());
            println!("  - {}: {} ({})", addr_type, addr.address, label);
        }
    }

    // Delete a contact
    println!("\n--- Delete Contact ---");
    let delete_id = "5";
    let result = contact_repo.delete(delete_id).await;
    println!("Deleted contact with ID {}: {}", delete_id, result);

    // Verify deletion
    println!("\n--- After Deletion ---");
    let contacts_after = contact_repo.get_all().await;
    println!("Total contacts: {}", contacts_after.len());
    for contact in contacts_after {
        println!("{} (ID: {})", contact.name, contact.id);
    }

    Ok(())
}