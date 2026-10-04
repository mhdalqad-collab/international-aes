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

## Content administration

The private `/admin` page manages previous projects, services, bilingual page text and contact details. It is intentionally absent from the public navigation. It requires `ADMIN_PASSWORD` (at least 12 characters), `ADMIN_SESSION_SECRET` (at least 32 characters), and the MySQL settings above. Set these in both GoDaddy Preview and Published Secrets. Do not use the client archive password as the admin password.

The first database request creates a `site_content` row from the exact content bundled with this branch. Existing public content is preserved; edits made in the admin page are saved to MySQL and appear on the site without a GitHub push. Admin changes are applied when **Save changes** is clicked, and an edit in another session must be reloaded before it can be overwritten. Uploaded project images are kept in `public/assets/site-images` and served through `/api/media/...`; back up this directory with MySQL. The original site images and logo are not modified by the admin page.

If the database is unavailable, the public website displays the bundled content while the admin page reports a database error. A code deployment can update the bundled starting content only before the database row has been created; afterward, the database is the source of truth.

To review this feature without updating `main`, connect GoDaddy Preview to the `codex/admin-content-management` branch under **Settings → Integrations**, pull that branch and select **Update Preview**. Add the admin secrets and database credentials to the **Preview** secrets. Open the preview URL followed by `/admin`. Do not select **Publish to Live** until the branch is approved; publishing Preview can update the live site even while GitHub `main` is unchanged. For isolated content editing tests, point Preview at a separate MySQL database.

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
