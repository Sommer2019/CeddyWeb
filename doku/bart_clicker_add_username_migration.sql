-- Migration: Add username, rebirth_count, and rebirth_multiplier columns to bart_clicker_game_state
-- This migration adds the missing columns to store username and rebirth data in the database
-- Run this in your Supabase SQL Editor

-- Add username column (optional, allows NULL for existing entries)
ALTER TABLE bart_clicker_game_state 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Add rebirth_count column (default to 0 for existing entries)
ALTER TABLE bart_clicker_game_state 
ADD COLUMN IF NOT EXISTS rebirth_count INTEGER NOT NULL DEFAULT 0;

-- Add rebirth_multiplier column (default to 1 for existing entries)
ALTER TABLE bart_clicker_game_state 
ADD COLUMN IF NOT EXISTS rebirth_multiplier NUMERIC NOT NULL DEFAULT 1;

-- Note: No index needed on username as it's not used for queries
-- The existing ip_hash index is sufficient for user lookups
