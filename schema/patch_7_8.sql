-- ----------------------------------------------------------------------------

-- rename 'username' to just 'name' (since we can also use email)
ALTER TABLE account RENAME COLUMN username TO email;
ALTER INDEX account_username_key RENAME TO account_email_key;

-- add the 'stripe_cus' on to the `account` table
ALTER TABLE account ADD COLUMN stripe_cus TEXT UNIQUE;

-- ----------------------------------------------------------------------------
