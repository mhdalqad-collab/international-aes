# GoDaddy Node.js Hosting deployment

This folder is the deployment root. `package.json` and `server.js` must appear at the top level of the uploaded ZIP. GoDaddy builds through Next.js' webpack pipeline because its restricted build environment blocks Turbopack's CSS subprocess, then runs the production build with Next.js's built-in server.

## 1. Create the app

1. Open GoDaddy **Node.js Hosting** and choose **Upload ZIP**.
2. Upload `AES_GoDaddy_Ready.zip` from the delivery folder.
3. Choose the Europe region when most visitors and administrators are in Europe or the Middle East.
4. Let GoDaddy install dependencies and run `npm run build`.

Do not use Managed WordPress, Websites + Marketing, or a static-file upload for this application.

## 2. Configure MySQL

Open the app's **Database** page and create or enable its managed MySQL database. In **Settings > Secrets**, add either the complete connection URL:

```text
DATABASE_URL=mysql://username:password@hostname:3306/database_name
```

or all five individual values:

```text
DB_HOST=hostname
DB_PORT=3306
DB_USER=username
DB_PASSWORD=password
DB_NAME=database_name
```

Add `DB_SSL=true` only if the database connection instructions require TLS. The app creates its tables automatically. You can alternatively import `database/schema.mysql.sql` using GoDaddy's SQL editor.

## 3. Add application secrets

Add the following in **Settings > Secrets** for both Preview and Publish:

```text
ARCHIVE_PASSWORD=<the administrator password>
ARCHIVE_SESSION_SECRET=<at least 32 random characters>
FILE_ENCRYPTION_SECRET=<a different value of at least 32 random characters>
ADMIN_PASSWORD=<a separate password of at least 12 characters>
ADMIN_SESSION_SECRET=<another random value of at least 32 characters>
```

Do not add `PORT`; GoDaddy supplies it automatically. Never put real secret values inside the ZIP.

To generate secrets in PowerShell:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Run it twice and use a different result for each secret.

## 4. Test the private preview

Verify all of the following before publishing:

- Arabic and English pages load and images appear.
- A consultation request is saved.
- `/archive` accepts the administrator password.
- The new customer appears in the archive.
- Excel export downloads successfully.
- A document up to 20 MB uploads and downloads correctly.
- Runtime logs contain no database or permission errors.
- `/admin` accepts its separate admin password, loads existing content, and saves a test change to Preview content. Restore that test change after checking.

## 5. Publish and connect the domain

Select **Publish Now**, then choose the domain in the app's Settings. GoDaddy configures its own domains automatically and provisions HTTPS. Preserve existing email-related DNS records when changing DNS manually.

## Backups

Back up these three items together:

1. The managed MySQL database.
2. `public/assets/customer-documents` from GoDaddy File Manager.
3. `FILE_ENCRYPTION_SECRET` in a secure password manager.
4. `public/assets/site-images` for uploaded project images.

An encrypted document backup is unusable without the same encryption secret.
