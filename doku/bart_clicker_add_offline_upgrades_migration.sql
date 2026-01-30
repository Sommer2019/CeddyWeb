-- Migration: Add offline_earning_upgrades column to bart_clicker_game_state
-- This adds support for purchasable offline earning upgrades with rebirth points

-- Add the new column to the game state table
ALTER TABLE bart_clicker_game_state 
ADD COLUMN IF NOT EXISTS offline_earning_upgrades INTEGER NOT NULL DEFAULT 0;
