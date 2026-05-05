# Scripts for Mi Pasador Admin Panel

This directory contains scripts for seeding data and templates for importing real data into the Mi Pasador admin panel.

## Files

### `seed-data.sql`
SQL script that inserts sample data for testing:
- 5 realistic merchants from Bermejo, Tarija (electrodomésticos, perfumería, calzado, supermercado, ferretería)
- 15 varied products with prices in BOB (Bolivianos)
- Realistic brands and market-appropriate prices
- Includes verification queries to check inserted data

### `merchants-template.csv`
CSV template for importing merchant data:
- Columns: name, description, phone_number, address, is_active
- Ready to be filled with real merchant data from field survey

### `products-template.csv`
CSV template for importing product data:
- Columns: merchant_name, name, description, price, currency, sku, category, stock, image_url, is_active
- Includes merchant_name column for easy reference (can be replaced with merchant_id after lookup)

## Usage

### Seeding Sample Data

To insert the sample data into your Supabase database:

1. **Using Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Paste the contents of `seed-data.sql`
   - Execute the query

2. **Using Supabase CLI (if configured locally):**
   ```bash
   npx supabase db push --seed ./scripts/seed-data.sql
   ```

3. **Using psql directly:**
   ```bash
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres" -f ./scripts/seed-data.sql
   ```

### Importing Real Field Data

1. Fill out the CSV templates with your real data from the field survey in Bermejo
2. For merchants-template.csv:
   - Fill in name, description, phone_number, address
   - Set is_active to true for active merchants

3. For products-template.csv:
   - Fill in merchant_name (matching exactly the merchant name from your merchants data)
   - Fill in product details: name, description, price (in BOB), currency (usually BOB), sku, category, stock, image_url (optional)
   - Set is_active to true for active products

4. Import the CSVs into your Supabase database:
   - **Option A:** Use Supabase Dashboard -> Table Editor -> Import CSV
   - **Option B:** Use psql with `\copy` command
   - **Option C:** Write a small script to parse the CSV and insert via Supabase JS client

## Data Format Notes

- **Prices:** Use BOB (Bolivianos). Reference: 1 USD ≈ 6.96 BOB
- **Timestamps:** created_at and updated_at are handled automatically by database triggers
- **Normalized Fields:** normalized_name and normalized_search_term are populated automatically by database triggers
- **UUIDs:** id columns are generated automatically by the database

## Verification

After importing data, you can verify it by:
1. Logging into the admin panel at `/admin/login`
2. Navigating to `/admin/merchants` to see merchants
3. Navigating to `/admin/products` to see products
4. Checking that the normalized fields are populated correctly

## Important

- Always backup your data before running mass imports
- Test with a small subset of data first
- Ensure your Supabase RLS policies allow the necessary operations for your import method