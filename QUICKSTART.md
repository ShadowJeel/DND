# Quick Start - DND Purchase Local Database

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Seed the Database (First Time Setup)
```bash
pnpm db:seed
```

This creates and populates the SQLite database with demo data:
- 3 users (2 buyers, 1 seller)
- 5 sample inquiries
- 2 sample offers

### 3. Run the Application
```bash
pnpm dev
```

The application will be available at http://localhost:3000

## 📊 Database Commands

```bash
# View database statistics
pnpm db:stats

# Reset and reseed database
pnpm db:seed
```

## 🔐 Demo Login Credentials

**Buyer 1:**
- Email: `buyer@tata.com`
- Password: `password`

**Buyer 2:**
- Email: `buyer@lnt.com`
- Password: `password`

**Seller:**
- Email: `seller@demo.com`
- Password: `password`

## 📁 Database Location

The SQLite database is stored at:
```
data/dnd-purchase.db
```

This file is automatically created on first run and is excluded from git.

## 🔍 Viewing the Database

Use any SQLite viewer:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [SQLite Viewer VS Code Extension](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer)
- Command line: `sqlite3 data/dnd-purchase.db`

## 📖 Full Documentation

See [DATABASE.md](./DATABASE.md) for complete database documentation.

## ⚠️ Important Notes

- **Development only**: This SQLite setup is for demo/development purposes
- **Plain text passwords**: Passwords are NOT encrypted (for demo purposes only)
- **Auto-initialization**: Database tables are created automatically on first run
- **Persistent data**: Data persists across application restarts
- **Production**: Replace with PostgreSQL/MySQL for production use

## 🛠️ Troubleshooting

**Database locked error:**
- Close any open SQLite browser applications
- Restart the dev server

**Missing data:**
- Run `pnpm db:seed` to reset and repopulate

**Build errors:**
- Delete the `data` folder and run `pnpm db:seed` again
