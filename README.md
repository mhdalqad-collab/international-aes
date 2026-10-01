# Automated Engineering Systems

Bilingual consulting website prepared for GoDaddy Node.js Hosting.

## Requirements

- Node.js 22 or newer
- MySQL 5.7/8.0 or MariaDB 10.6

## Local development

1. Copy `godaddy.env.example` to `.env.local` and enter local MySQL details and strong secrets.
2. Install dependencies with `npm ci`.
3. Start development mode with `npm run dev`.
4. Open `http://localhost:3000`.

The application creates the required MySQL tables automatically on the first database request. The same schema is also available at `database/schema.mysql.sql` for manual import.

## Production commands

- `npm run build` creates the production Next.js build.
- `npm run build` uses Next.js' webpack pipeline, which is compatible with GoDaddy's restricted build environment.
- `npm start` starts the built-in Next.js production server on the `PORT` supplied by GoDaddy.

## GoDaddy deployment

See `GODADDY_DEPLOYMENT.md` for the complete upload, secrets, database, preview, and publishing checklist.

## Data storage

- Customer and document metadata is stored in MySQL.
- Uploaded documents are encrypted with AES-256-GCM and stored under `public/assets/customer-documents`, the persistent path documented by GoDaddy Node.js Hosting.
- Documents are decrypted only by the authenticated download API.
- Back up both the MySQL database and the encrypted document directory together. Keep `FILE_ENCRYPTION_SECRET` safe; files cannot be recovered without it.
