import Array "mo:base/Array";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Types "types";

module {
    // Maximum number of contacts per user
    private let MAX_CONTACTS_PER_USER = 500;

    // Create a new contact store for a user
    public func createContactStore(): Types.ContactStore {
        {
            contacts = HashMap.HashMap<Text, Types.Contact>(16, Text.equal, Text.hash);
        }
    };

    // Add a contact to the store
    public func addContact(
        store: Types.ContactStore, 
        input: Types.AddContactInput
    ): Types.ContactResult<()> {
        let contact = input.contact;
        
        // Check if we've reached the maximum number of contacts
        if (store.contacts.size() >= MAX_CONTACTS_PER_USER) {
            return #Err(#LimitExceeded);
        };
        
        // Generate a unique key for the contact
        let key = Types.generateContactKey(contact.address, contact.network);
        
        // Check if the contact already exists
        switch (store.contacts.get(key)) {
            case (?_) {
                #Err(#AlreadyExists)
            };
            case (null) {
                // Add the contact to the store
                store.contacts.put(key, contact);
                #Ok(())
            };
        }
    };

    // Update a contact in the store
    public func updateContact(
        store: Types.ContactStore, 
        input: Types.UpdateContactInput
    ): Types.ContactResult<()> {
        // Generate the key for the contact
        let key = Types.generateContactKey(input.address, input.network);
        
        // Check if the contact exists
        switch (store.contacts.get(key)) {
            case (null) {
                #Err(#NotFound)
            };
            case (?existingContact) {
                // Update the contact
                let updatedContact: Types.Contact = {
                    address = existingContact.address;
                    network = existingContact.network;
                    alias = input.alias;
                    notes = input.notes;
                    group = input.group;
                    is_favorite = input.isFavorite;
                    last_used = if (input.isFavorite and Option.isNull(existingContact.last_used)) {
                        ?Time.now()
                    } else {
                        existingContact.last_used
                    };
                };
                
                store.contacts.put(key, updatedContact);
                #Ok(())
            };
        }
    };

    // Delete a contact from the store
    public func deleteContact(
        store: Types.ContactStore, 
        input: Types.DeleteContactInput
    ): Types.ContactResult<()> {
        // Generate the key for the contact
        let key = Types.generateContactKey(input.address, input.network);
        
        // Check if the contact exists
        switch (store.contacts.get(key)) {
            case (null) {
                #Err(#NotFound)
            };
            case (?_) {
                // Remove the contact
                store.contacts.delete(key);
                #Ok(())
            };
        }
    };

    // Toggle favorite status for a contact
    public func toggleFavorite(
        store: Types.ContactStore, 
        input: Types.ToggleFavoriteInput
    ): Types.ContactResult<()> {
        // Generate the key for the contact
        let key = Types.generateContactKey(input.address, input.network);
        
        // Check if the contact exists
        switch (store.contacts.get(key)) {
            case (null) {
                #Err(#NotFound)
            };
            case (?existingContact) {
                // Update the favorite status
                let updatedContact: Types.Contact = {
                    address = existingContact.address;
                    network = existingContact.network;
                    alias = existingContact.alias;
                    notes = existingContact.notes;
                    group = existingContact.group;
                    is_favorite = input.isFavorite;
                    last_used = if (input.isFavorite) { ?Time.now() } else { existingContact.last_used };
                };
                
                store.contacts.put(key, updatedContact);
                #Ok(())
            };
        }
    };

    // Get all contacts for a user
    public func getContacts(store: Types.ContactStore): [Types.Contact] {
        let contacts = Iter.toArray(store.contacts.vals());
        contacts
    };

    // Update last used timestamp for a contact
    public func updateLastUsed(
        store: Types.ContactStore, 
        address: Text, 
        network: Types.ContactNetwork
    ): Types.ContactResult<()> {
        // Generate the key for the contact
        let key = Types.generateContactKey(address, network);
        
        // Check if the contact exists
        switch (store.contacts.get(key)) {
            case (null) {
                #Err(#NotFound)
            };
            case (?existingContact) {
                // Update the last used timestamp
                let updatedContact: Types.Contact = {
                    address = existingContact.address;
                    network = existingContact.network;
                    alias = existingContact.alias;
                    notes = existingContact.notes;
                    group = existingContact.group;
                    is_favorite = existingContact.is_favorite;
                    last_used = ?Time.now();
                };
                
                store.contacts.put(key, updatedContact);
                #Ok(())
            };
        }
    };
}