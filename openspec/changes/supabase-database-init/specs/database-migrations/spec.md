## ADDED Requirements

### Requirement: Version-controlled schema changes
The system SHALL use migration files to track and apply database schema changes in a versioned, sequential manner.

#### Scenario: Migration file creation
- **WHEN** a developer needs to modify the schema
- **THEN** the system provides a mechanism to generate a timestamped migration file

#### Scenario: Migration execution order
- **WHEN** applying migrations
- **THEN** the system executes them in chronological order based on timestamp

### Requirement: Migration tracking table
The system SHALL maintain a migrations table that records which migrations have been applied and when.

#### Scenario: Applied migration recording
- **WHEN** a migration completes successfully
- **THEN** the system records the migration name and timestamp in the migrations table

#### Scenario: Duplicate migration prevention
- **WHEN** attempting to apply an already-applied migration
- **THEN** the system skips it without error

### Requirement: Rollback capability
The system SHALL support rolling back migrations to revert schema changes when needed.

#### Scenario: Migration rollback
- **WHEN** a migration needs to be reverted
- **THEN** the system executes the down/rollback script and removes the migration record

#### Scenario: Rollback validation
- **WHEN** rolling back a migration
- **THEN** the system verifies the rollback script exists before proceeding

### Requirement: Migration file structure
The system SHALL use a consistent migration file format with up and down operations clearly defined.

#### Scenario: Migration file format
- **WHEN** creating a migration file
- **THEN** the file contains both up (apply) and down (rollback) SQL statements

#### Scenario: Migration naming convention
- **WHEN** generating migration files
- **THEN** the system uses format: YYYYMMDDHHMMSS_descriptive_name.sql

### Requirement: Initial schema migration
The system SHALL provide an initial migration that creates all base tables, indexes, and constraints.

#### Scenario: Fresh database setup
- **WHEN** initializing a new database
- **THEN** the initial migration creates all required tables in the correct order

#### Scenario: Dependency ordering
- **WHEN** the initial migration runs
- **THEN** tables are created before foreign keys that reference them

### Requirement: Migration idempotency
The system SHALL ensure migrations can be safely re-run without causing errors or data corruption.

#### Scenario: Idempotent table creation
- **WHEN** a migration creates a table
- **THEN** it uses CREATE TABLE IF NOT EXISTS or equivalent

#### Scenario: Idempotent index creation
- **WHEN** a migration creates an index
- **THEN** it checks for existence before creation or uses IF NOT EXISTS

### Requirement: Environment-specific migrations
The system SHALL support running migrations across different environments (development, staging, production) with appropriate safeguards.

#### Scenario: Production migration safety
- **WHEN** applying migrations to production
- **THEN** the system requires explicit confirmation or uses a production-specific flag

#### Scenario: Development migration flexibility
- **WHEN** applying migrations in development
- **THEN** the system allows rapid iteration and testing without strict safeguards

### Requirement: Migration validation
The system SHALL validate migration syntax and dependencies before execution.

#### Scenario: Syntax validation
- **WHEN** a migration file contains invalid SQL
- **THEN** the system reports the error before attempting execution

#### Scenario: Dependency validation
- **WHEN** a migration references non-existent tables or columns
- **THEN** the system detects and reports the dependency issue
