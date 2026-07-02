## ADDED Requirements

### Requirement: User-scoped data access
The system SHALL enforce Row Level Security (RLS) policies that restrict users to accessing only their own data or publicly visible data.

#### Scenario: User viewing own items
- **WHEN** a user queries their lost or found items
- **THEN** the system returns only items where the user is the reporter or finder

#### Scenario: User viewing public items
- **WHEN** a user browses all items
- **THEN** the system returns items marked as public or active for matching

### Requirement: RLS policy enablement
The system SHALL enable RLS on all tables containing user-specific or sensitive data.

#### Scenario: RLS enforcement
- **WHEN** RLS is enabled on a table
- **THEN** all queries are subject to policy checks regardless of client

#### Scenario: Bypass prevention
- **WHEN** attempting to access data without proper authentication
- **THEN** the system returns no rows due to RLS policy restrictions

### Requirement: Authentication-based policies
The system SHALL use Supabase authentication context (auth.uid()) to enforce RLS policies.

#### Scenario: Authenticated user access
- **WHEN** an authenticated user queries data
- **THEN** the system applies policies using their user ID from auth.uid()

#### Scenario: Anonymous user access
- **WHEN** an unauthenticated user queries data
- **THEN** the system applies anonymous access policies (read-only public data)

### Requirement: Role-based access control
The system SHALL support different RLS policies for different user roles (admin, moderator, regular user).

#### Scenario: Admin full access
- **WHEN** an admin user queries data
- **THEN** the system grants access to all records regardless of ownership

#### Scenario: Moderator access
- **WHEN** a moderator queries data
- **THEN** the system grants access to flagged or reported items for review

### Requirement: Policy for SELECT operations
The system SHALL define RLS policies that control which rows users can read.

#### Scenario: User reading own profile
- **WHEN** a user queries the users table
- **THEN** the system allows reading their own profile and public profiles of others

#### Scenario: User reading items
- **WHEN** a user queries items
- **THEN** the system allows reading their own items and public active items

### Requirement: Policy for INSERT operations
The system SHALL define RLS policies that control which rows users can create.

#### Scenario: User creating item
- **WHEN** a user inserts a new item
- **THEN** the system allows insertion only if the user_id matches auth.uid()

#### Scenario: Unauthorized insertion prevention
- **WHEN** a user attempts to insert data with another user's ID
- **THEN** the system rejects the operation due to RLS policy violation

### Requirement: Policy for UPDATE operations
The system SHALL define RLS policies that control which rows users can modify.

#### Scenario: User updating own item
- **WHEN** a user updates an item they own
- **THEN** the system allows the update

#### Scenario: User updating others' items
- **WHEN** a user attempts to update another user's item
- **THEN** the system rejects the operation due to RLS policy violation

### Requirement: Policy for DELETE operations
The system SHALL define RLS policies that control which rows users can delete.

#### Scenario: User deleting own item
- **WHEN** a user deletes an item they own
- **THEN** the system allows the deletion

#### Scenario: User deleting others' items
- **WHEN** a user attempts to delete another user's item
- **THEN** the system rejects the operation due to RLS policy violation

### Requirement: Policy testing and validation
The system SHALL provide mechanisms to test RLS policies before deployment.

#### Scenario: Policy test execution
- **WHEN** testing RLS policies
- **THEN** the system can simulate different user contexts and verify access control

#### Scenario: Policy coverage verification
- **WHEN** reviewing RLS policies
- **THEN** all tables with user data have appropriate policies defined

### Requirement: Performance optimization
The system SHALL ensure RLS policies are optimized to avoid performance degradation.

#### Scenario: Indexed policy columns
- **WHEN** RLS policies filter by user_id
- **THEN** the system uses indexes on user_id columns for efficient filtering

#### Scenario: Policy complexity monitoring
- **WHEN** executing queries with RLS
- **THEN** the system monitors query performance to detect policy-related slowdowns
