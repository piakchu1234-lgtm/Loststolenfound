## ADDED Requirements

### Requirement: Core tables for lost and found items
The system SHALL provide database tables to store lost items, found items, users, and related metadata with proper relationships and constraints.

#### Scenario: Lost item creation
- **WHEN** a user reports a lost item
- **THEN** the system stores the item with required fields (title, description, category, location, date_lost, reporter_id)

#### Scenario: Found item creation
- **WHEN** a user reports a found item
- **THEN** the system stores the item with required fields (title, description, category, location, date_found, finder_id)

#### Scenario: Item matching
- **WHEN** querying for potential matches between lost and found items
- **THEN** the system can efficiently join and filter items by category, location, and date ranges

### Requirement: User profile storage
The system SHALL maintain user profiles with authentication metadata and contact information.

#### Scenario: User registration
- **WHEN** a new user registers
- **THEN** the system creates a user record with email, display name, and timestamps

#### Scenario: User profile retrieval
- **WHEN** displaying user information
- **THEN** the system retrieves user profile data linked to their authentication ID

### Requirement: Item status tracking
The system SHALL track the lifecycle status of lost and found items (active, matched, claimed, expired).

#### Scenario: Status transition
- **WHEN** an item status changes from active to matched
- **THEN** the system updates the status field and records the transition timestamp

#### Scenario: Status filtering
- **WHEN** querying items by status
- **THEN** the system returns only items matching the specified status

### Requirement: Location data structure
The system SHALL store location information with sufficient detail for matching and display (coordinates, address, landmark).

#### Scenario: Location-based search
- **WHEN** searching for items near a specific location
- **THEN** the system can filter items by geographic proximity using stored coordinates

#### Scenario: Location display
- **WHEN** displaying item details
- **THEN** the system shows human-readable location information (address or landmark)

### Requirement: Category taxonomy
The system SHALL organize items into predefined categories (electronics, documents, accessories, pets, other) with extensibility.

#### Scenario: Category assignment
- **WHEN** creating an item
- **THEN** the user selects from available categories stored in the database

#### Scenario: Category-based filtering
- **WHEN** browsing items by category
- **THEN** the system returns items matching the selected category

### Requirement: Timestamps and audit trail
The system SHALL record creation, update, and deletion timestamps for all entities to support audit and data integrity.

#### Scenario: Creation tracking
- **WHEN** a new record is created
- **THEN** the system automatically sets created_at timestamp

#### Scenario: Update tracking
- **WHEN** a record is modified
- **THEN** the system automatically updates updated_at timestamp

### Requirement: Foreign key relationships
The system SHALL enforce referential integrity between related tables using foreign key constraints.

#### Scenario: User deletion protection
- **WHEN** attempting to delete a user with associated items
- **THEN** the system prevents deletion or cascades appropriately based on business rules

#### Scenario: Orphaned record prevention
- **WHEN** querying items
- **THEN** all foreign key references (user_id, category_id) resolve to valid records

### Requirement: Data type validation
The system SHALL enforce appropriate data types and constraints (NOT NULL, UNIQUE, CHECK) at the database level.

#### Scenario: Required field enforcement
- **WHEN** inserting a record without required fields
- **THEN** the database rejects the operation with a constraint violation error

#### Scenario: Email uniqueness
- **WHEN** attempting to create a user with an existing email
- **THEN** the database rejects the operation due to UNIQUE constraint
