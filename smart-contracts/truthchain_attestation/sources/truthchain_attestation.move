#[allow(duplicate_alias)]
module truthchain::media_attestation {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use std::string::{Self, String};
    use std::vector;
    use sui::event;

    // Error codes
    const EInvalidHash: u64 = 1;
    const EAlreadyExists: u64 = 2;

    // Media attestation record
    public struct MediaAttestation has key, store {
        id: UID,
        media_hash: vector<u8>,
        walrus_blob_id: String,
        created_at: u64,
        creator: address,
        source: String,
        media_type: String,
        is_ai_generated: bool,
        metadata: String,
        verification_count: u64,
    }

    // Global registry
    public struct AttestationRegistry has key {
        id: UID,
        total_attestations: u64,
        hash_to_id: Table<vector<u8>, address>,
    }

    // Events
    public struct AttestationCreated has copy, drop {
        attestation_id: address,
        media_hash: vector<u8>,
        creator: address,
        timestamp: u64,
    }

    public struct AttestationVerified has copy, drop {
        attestation_id: address,
        verifier: address,
        timestamp: u64,
    }

    // Initialize registry
    fun init(ctx: &mut TxContext) {
        let registry = AttestationRegistry {
            id: object::new(ctx),
            total_attestations: 0,
            hash_to_id: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    // Register new media
    public fun register_media(
        media_hash: vector<u8>,
        walrus_blob_id: vector<u8>,
        source: vector<u8>,
        media_type: vector<u8>,
        is_ai_generated: bool,
        metadata: vector<u8>,
        registry: &mut AttestationRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(vector::length(&media_hash) == 32, EInvalidHash);
        assert!(!table::contains(&registry.hash_to_id, media_hash), EAlreadyExists);

        let attestation = MediaAttestation {
            id: object::new(ctx),
            media_hash,
            walrus_blob_id: string::utf8(walrus_blob_id),
            created_at: clock::timestamp_ms(clock),
            creator: tx_context::sender(ctx),
            source: string::utf8(source),
            media_type: string::utf8(media_type),
            is_ai_generated,
            metadata: string::utf8(metadata),
            verification_count: 0,
        };

        let attestation_addr = object::uid_to_address(&attestation.id);
        table::add(&mut registry.hash_to_id, media_hash, attestation_addr);
        registry.total_attestations = registry.total_attestations + 1;

        event::emit(AttestationCreated {
            attestation_id: attestation_addr,
            media_hash,
            creator: tx_context::sender(ctx),
            timestamp: clock::timestamp_ms(clock),
        });

        transfer::share_object(attestation);
    }

    // Verify media
    public fun verify_media(
        attestation: &mut MediaAttestation,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        attestation.verification_count = attestation.verification_count + 1;

        event::emit(AttestationVerified {
            attestation_id: object::uid_to_address(&attestation.id),
            verifier: tx_context::sender(ctx),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    // View functions
    public fun get_media_hash(attestation: &MediaAttestation): vector<u8> {
        attestation.media_hash
    }

    public fun get_created_at(attestation: &MediaAttestation): u64 {
        attestation.created_at
    }

    public fun get_creator(attestation: &MediaAttestation): address {
        attestation.creator
    }

    public fun get_source(attestation: &MediaAttestation): String {
        attestation.source
    }

    public fun get_verification_count(attestation: &MediaAttestation): u64 {
        attestation.verification_count
    }
}