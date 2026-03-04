# Database Setup - DND Purchase

This project uses **SQLite** as a local database for demo/development purposes. All data is stored persistently in a local database file.

## Database Structure

### Tables

1. **users** - Stores user information (buyers and sellers)
   - id, name, email, phone, password
   - company, role, entity_type, verification_type
   - gstin, aadhaar_number
   - verified, created_at

2. **inquiries** - Purchase inquiries from buyers
   - id, buyer_id, buyer_name
   - status (open/bidding/closed)
   - created_at

3. **inquiry_items** - Items within each inquiry
   - id, inquiry_id
   - product, thickness, width, length, grade
   - quantity, delivery_terms, payment_terms, comments

4. **offers** - Seller quotations for inquiry items
   - id, inquiry_id, inquiry_item_id
   - seller_id, seller_name
   - price_per_ton, comments
   - pdf_url, contact_email, contact_phone
   - status (pending/accepted/rejected/disqualified)
   - rank, created_at

## Database Location

The SQLite database file is created at:
```
data/dnd-purchase.db
```

This directory is gitignored to prevent committing local database files.

## Initial Setup

The database is automatically initialized when the application starts. Tables and indexes are created if they don't exist.

To seed the database with demo data, run:

```bash
pnpm db:seed
```

This will:
- Clear existing data
- Insert 3 demo users (2 buyers, 1 seller)
- Insert 5 sample inquiries with items
- Insert 2 sample offers

## Demo Users

**Buyer 1:**
- Email: buyer@tata.com
- Password: password
- Company: Tata Projects Ltd

**Buyer 2:**
- Email: buyer@lnt.com
- Password: password
- Company: L&T Construction

**Seller:**
- Email: seller@demo.com
- Password: password
- Company: Demo Steel Traders
- GSTIN: 27AABCU9603R1ZN

## Database Management

### View Database
You can use any SQLite browser to view the database:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [SQLite Viewer VS Code Extension](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer)

### Reset Database
To reset and reseed the database:
```bash
pnpm db:seed
```

### Backup Database
Simply copy the `data/dnd-purchase.db` file to create a backup.

## Migration to Production

For production deployment:
1. Replace SQLite with PostgreSQL/MySQL
2. Use an ORM like Prisma or Drizzle
3. Implement proper migrations
4. Add connection pooling
5. Encrypt sensitive data (passwords should use bcrypt)

## Notes

- **Passwords are stored in plain text for demo purposes only**
- Foreign key constraints are enabled
- Auto-incrementing IDs use custom format (USR-0001, INQ-0001, etc.)
- Indexes are created for common query patterns
