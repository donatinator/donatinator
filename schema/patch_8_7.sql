-- ----------------------------------------------------------------------------

-- remove these columns
ALTER TABLE account DROP COLUMN stripe_cus;

-- rename the name column back to username
ALTER INDEX account_email_key RENAME TO account_username_key;
ALTER TABLE account RENAME COLUMN email TO username;

-- ----------------------------------------------------------------------------
