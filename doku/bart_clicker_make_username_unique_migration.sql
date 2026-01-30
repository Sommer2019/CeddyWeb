-- Migration: Make usernames unique in Bart Klicker tables
-- This migration adds UNIQUE constraints to username columns and handles IP changes properly
-- 
-- IMPORTANT: Run this migration during low-traffic periods
-- Duplicate usernames will be handled by appending a suffix

-- Step 1: Handle duplicate usernames in bart_clicker_game_state
-- Find and rename duplicates by appending a numeric suffix (case-insensitive)
DO $$
DECLARE
    duplicate_username TEXT;
    duplicate_id BIGINT;
    counter INTEGER;
BEGIN
    -- Find all duplicate usernames (case-insensitive)
    FOR duplicate_username IN 
        SELECT LOWER(username) 
        FROM bart_clicker_game_state 
        WHERE username IS NOT NULL 
        GROUP BY LOWER(username)
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        
        -- Update each duplicate (except the first one) with a suffix
        FOR duplicate_id IN 
            SELECT id 
            FROM bart_clicker_game_state 
            WHERE LOWER(username) = duplicate_username
            ORDER BY last_updated ASC
            OFFSET 1  -- Keep the first one unchanged
        LOOP
            UPDATE bart_clicker_game_state
            SET username = username || '_' || counter
            WHERE id = duplicate_id;
            
            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- Step 2: Add UNIQUE constraint to bart_clicker_game_state.username
ALTER TABLE bart_clicker_game_state
DROP CONSTRAINT IF EXISTS bart_clicker_game_state_username_key;

ALTER TABLE bart_clicker_game_state
ADD CONSTRAINT bart_clicker_game_state_username_key UNIQUE (username);

-- Step 3: Handle duplicate usernames in bart_clicker_leaderboard (if table exists)
DO $$
DECLARE
    duplicate_username TEXT;
    duplicate_ip_hash TEXT;
    counter INTEGER;
BEGIN
    -- Check if bart_clicker_leaderboard table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bart_clicker_leaderboard'
    ) THEN
        -- Find all duplicate usernames (case-insensitive)
        FOR duplicate_username IN 
            SELECT LOWER(username) 
            FROM bart_clicker_leaderboard 
            WHERE username IS NOT NULL 
            GROUP BY LOWER(username)
            HAVING COUNT(*) > 1
        LOOP
            counter := 1;
            
            -- Update each duplicate (except the first one) with a suffix
            FOR duplicate_ip_hash IN 
                SELECT ip_hash 
                FROM bart_clicker_leaderboard 
                WHERE LOWER(username) = duplicate_username
                ORDER BY last_updated ASC
                OFFSET 1  -- Keep the first one unchanged
            LOOP
                UPDATE bart_clicker_leaderboard
                SET username = username || '_' || counter
                WHERE ip_hash = duplicate_ip_hash;
                
                counter := counter + 1;
            END LOOP;
        END LOOP;
    END IF;
END $$;

-- Step 4: Add UNIQUE constraint to bart_clicker_leaderboard.username (if table exists)
DO $$
BEGIN
    -- Check if bart_clicker_leaderboard table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bart_clicker_leaderboard'
    ) THEN
        -- Drop existing constraint if it exists
        ALTER TABLE bart_clicker_leaderboard
        DROP CONSTRAINT IF EXISTS bart_clicker_leaderboard_username_key;
        
        -- Add new UNIQUE constraint
        ALTER TABLE bart_clicker_leaderboard
        ADD CONSTRAINT bart_clicker_leaderboard_username_key UNIQUE (username);
    END IF;
END $$;

-- Step 5: Create index for better performance on username lookups
CREATE INDEX IF NOT EXISTS idx_bart_clicker_game_state_username 
    ON bart_clicker_game_state(username) 
    WHERE username IS NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bart_clicker_leaderboard'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_bart_clicker_leaderboard_username 
            ON bart_clicker_leaderboard(username) 
            WHERE username IS NOT NULL;
    END IF;
END $$;

-- Migration complete!
-- Usernames are now unique across the system
-- The application code must now check for username uniqueness before insertion
