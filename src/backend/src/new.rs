use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

// Define address types for various blockchains
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AddressType {
    BTC,
    ETH,
    SOL,
    ICP,
}

// Structure for blockchain addresses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Address {
    pub address_type: AddressType,
    pub address: String,
    pub label: Option<String>,
    pub is_default: bool,
}

// Main contact structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub avatar: Option<String>,
    pub addresses: Vec<Address>,
    pub notes: Option<String>,
    pub is_favorite: bool,
    pub last_updated: DateTime<Utc>,
}

// Repository trait for contact operations
#[async_trait::async_trait]
pub trait ContactRepository: Send + Sync {
    async fn get_all(&self) -> Vec<Contact>;
    async fn get_by_id(&self, id: &str) -> Option<Contact>;
    async fn save(&self, contact: Contact) -> Contact;
    async fn delete(&self, id: &str) -> bool;
    async fn search_by_name(&self, query: &str) -> Vec<Contact>;
    async fn filter_by_address_type(&self, address_type: &AddressType) -> Vec<Contact>;
    async fn get_favorites(&self) -> Vec<Contact>;
}

// Mock implementation of the contact repository
pub struct MockContactRepository {
    contacts: Arc<Mutex<HashMap<String, Contact>>>,
}

impl MockContactRepository {
    pub fn new() -> Self {
        let contacts = create_mock_contacts();
        Self {
            contacts: Arc::new(Mutex::new(contacts)),
        }
    }
}

#[async_trait::async_trait]
impl ContactRepository for MockContactRepository {
    async fn get_all(&self) -> Vec<Contact> {
        let contacts = self.contacts.lock().expect("Failed to lock contacts mutex");
        contacts.values().cloned().collect()
    }

    async fn get_by_id(&self, id: &str) -> Option<Contact> {
        let contacts = self.contacts.lock().expect("Failed to lock contacts mutex");
        contacts.get(id).cloned()
    }

    async fn save(&self, mut contact: Contact) -> Contact {
        let mut contacts = self.contacts.lock().expect("Failed to lock contacts mutex");

        // Update last_updated timestamp
        contact.last_updated = Utc::now();

        // If it's a new contact without an ID, generate a UUID
        if contact.id.is_empty() {
            contact.id = Uuid::new_v4().to_string();
        }

        contacts.insert(contact.id.clone(), contact.clone());
        contact
    }

    async fn delete(&self, id: &str) -> bool {
        let mut contacts = self.contacts.lock().expect("Failed to lock contacts mutex");
        contacts.remove(id).is_some()
    }

    async fn search_by_name(&self, query: &str) -> Vec<Contact> {
        let contacts = self.contacts.lock().expect("Failed to lock contacts mutex");
        let query = query.to_lowercase();

        contacts
            .values()
            .filter(|contact| contact.name.to_lowercase().contains(&query))
            .cloned()
            .collect()
    }

    async fn filter_by_address_type(&self, address_type: &AddressType) -> Vec<Contact> {
        let contacts = self.contacts.lock().expect("Failed to lock contacts mutex");

        contacts
            .values()
            .filter(|contact| {
                contact.addresses.iter().any(|addr| addr.address_type == *address_type)
            })
            .cloned()
            .collect()
    }

    async fn get_favorites(&self) -> Vec<Contact> {
        let contacts = self.contacts.lock().expect("Failed to lock contacts mutex");

        contacts
            .values()
            .filter(|contact| contact.is_favorite)
            .cloned()
            .collect()
    }
}

// Generate random avatar URLs using placeholder services
fn generate_avatar(seed: &str) -> String {
    // Use the seed to get consistent avatars for the same contact
    let hash: u32 = seed.chars().map(|c| c as u32).sum();
    format!("https://avatars.dicebear.com/api/avataaars/{}.svg", hash)
}

// Create mock contacts data
fn create_mock_contacts() -> HashMap<String, Contact> {
    let mut contacts = HashMap::new();

    // Sample contacts
    let alice = Contact {
        id: "1".to_string(),
        name: "Alice Johnson".to_string(),
        avatar: Some(generate_avatar("Alice Johnson")),
        addresses: vec![
            Address {
                address_type: AddressType::BTC,
                address: "bc1q9h6mqsj45cz9y5rnxc7m42a4g46qzhfgdp83pn".to_string(),
                label: Some("Hardware Wallet".to_string()),
                is_default: true,
            },
            Address {
                address_type: AddressType::ETH,
                address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e".to_string(),
                label: Some("MetaMask".to_string()),
                is_default: false,
            },
            Address {
                address_type: AddressType::ICP,
                address: "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe".to_string(),
                label: Some("NNS".to_string()),
                is_default: false,
            },
        ],
        notes: Some("Friend from college".to_string()),
        is_favorite: true,
        last_updated: Utc::now(),
    };

    let bob = Contact {
        id: "2".to_string(),
        name: "Bob Smith".to_string(),
        avatar: Some(generate_avatar("Bob Smith")),
        addresses: vec![
            Address {
                address_type: AddressType::ETH,
                address: "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE".to_string(),
                label: Some("Trading Account".to_string()),
                is_default: true,
            },
            Address {
                address_type: AddressType::SOL,
                address: "DRpbCBMxVnDK4UKvXgYBp2HfvUMiEuUR5qjvsf9WvQZr".to_string(),
                label: Some("Phantom Wallet".to_string()),
                is_default: true,
            },
        ],
        notes: Some("Crypto study group".to_string()),
        is_favorite: false,
        last_updated: Utc::now(),
    };

    let carol = Contact {
        id: "3".to_string(),
        name: "Carol Williams".to_string(),
        avatar: Some(generate_avatar("Carol Williams")),
        addresses: vec![
            Address {
                address_type: AddressType::BTC,
                address: "3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5".to_string(),
                label: Some("Cold Storage".to_string()),
                is_default: true,
            },
            Address {
                address_type: AddressType::ETH,
                address: "0x6B175474E89094C44Da98b954EedeAC495271d0F".to_string(),
                label: Some("Donation Address".to_string()),
                is_default: true,
            },
            Address {
                address_type: AddressType::ICP,
                address: "xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae".to_string(),
                label: Some("DFINITY Wallet".to_string()),
                is_default: true,
            },
        ],
        notes: None,
        is_favorite: true,
        last_updated: Utc::now(),
    };

    let dave = Contact {
        id: "4".to_string(),
        name: "Dave Brown".to_string(),
        avatar: Some(generate_avatar("Dave Brown")),
        addresses: vec![
            Address {
                address_type: AddressType::SOL,
                address: "9LnKnhwvGMDnU2zetQji69chJ9McnCYdcGHF3UJAGxwT".to_string(),
                label: Some("Main Account".to_string()),
                is_default: true,
            },
        ],
        notes: Some("Work colleague - Solana dev".to_string()),
        is_favorite: false,
        last_updated: Utc::now(),
    };

    let eve = Contact {
        id: "5".to_string(),
        name: "Eve Davis".to_string(),
        avatar: Some(generate_avatar("Eve Davis")),
        addresses: vec![
            Address {
                address_type: AddressType::BTC,
                address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq".to_string(),
                label: Some("Exchange".to_string()),
                is_default: true,
            },
            Address {
                address_type: AddressType::ETH,
                address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9".to_string(),
                label: Some("DeFi Wallet".to_string()),
                is_default: true,
            },
            Address {
                address_type: AddressType::ICP,
                address: "l3lfs-gak7g-xrbil-j4v4h-aztjn-4jyki-wprso-m27h3-ibcl3-2cwuz-oqe".to_string(),
                label: Some("Internet Computer".to_string()),
                is_default: true,
            },
        ],
        notes: None,
        is_favorite: true,
        last_updated: Utc::now(),
    };

    // Add contacts to the hashmap
    contacts.insert(alice.id.clone(), alice);
    contacts.insert(bob.id.clone(), bob);
    contacts.insert(carol.id.clone(), carol);
    contacts.insert(dave.id.clone(), dave);
    contacts.insert(eve.id.clone(), eve);

    contacts
}

// Factory function to create a repository
pub fn create_mock_contact_repository() -> impl ContactRepository {
    MockContactRepository::new()
}