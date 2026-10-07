# GoDaddy Node.js Hosting deployment

This folder is the deployment root. `package.json` and `server.js` must appear at the top level of the uploaded ZIP. GoDaddy builds through Next.js' webpack pipeline because its restricted build environment blocks Turbopack's CSS subprocess, then runs the production build with Next.js's built-in server.

The website's Geist, Geist Mono, and Noto Sans Arabic fonts are bundled in `public/fonts` with their licenses. Keep this folder in the deployment. Font loading uses `app/fonts.css`, so builds do not depend on Google's font API or the `next/font/google` URL parser.

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

For inquiry email notifications, add only these two email secrets to each environment you use (Preview and Publish):

```text
RESEND_API_KEY=<your Resend API key>
INQUIRY_TO_EMAIL=info@international-aes.com
```

The server sends the existing plain-text inquiry notification through Resend's HTTPS API, currently from `onboarding@resend.dev`. Keep the API key in GoDaddy Secrets, never in frontend code or the repository. Resend may restrict this onboarding sender to the email address associated with your Resend account; to reliably send to `info@international-aes.com`, verify `international-aes.com` in Resend and then change the sender address in `app/lib/inquiry-email.ts` to one on that verified domain. An email failure does not discard the inquiry: it remains in the client archive, and Runtime Logs show `email notification failed`. Confirm a real Preview submission reaches the inbox before relying on notifications.

To generate secrets in PowerShell:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Run it twice and use a different result for each secret.

## 4. Test the private preview

Verify all of the following before publishing:

- Arabic and English pages load and images appear.
- A consultation request is saved.
- With the Resend email secrets configured, a notification for the request reaches the intended inbox; verify both the Inbox and Spam folders.
- `/archive` accepts the administrator password.
- The new customer appears in the archive.
- Excel export downloads successfully.
- A document up to 20 MB uploads and downloads correctly.
- Runtime logs contain no database or permission errors.
- `/admin` accepts its separate admin password, loads existing content, and saves a test change to Preview content. Restore that test change after checking.
- Upload a project image in `/admin`, save the project, and confirm it is visible. Restart the Preview app and open the same image URL with browser caching disabled to verify it is still served.

### Project-image storage upgrade

New project images are stored in MySQL (`site_images` and `site_image_chunks`), using the same database settings as editable content. No additional storage secrets are needed. Uploads use a transaction and small binary chunks so large images do not require one large SQL packet. A failed database write returns an upload error rather than an image URL.

Before deploying this fix for the first time, download any existing `public/assets/site-images` files from GoDaddy File Manager in Preview and Publish. Earlier versions stored only image URLs in MySQL and the actual files in the app folder; rebuilding or replacing that folder can lose the files. After deployment, any legacy files that remain are imported into MySQL when their existing `/api/media/<key>` URLs are opened. If the folder was replaced, restore your backup to that folder and open the image URLs to import them, or re-upload images through `/admin` and save the projects. Already-missing files cannot be restored from the database URLs alone.

Future source updates retain these images when the app continues to use the same MySQL database. If Preview and Publish use different databases, their content and images are separate; point them at the appropriate database or migrate both the content and image tables together.

## 5. Publish and connect the domain

Select **Publish Now**, then choose the domain in the app's Settings. GoDaddy configures its own domains automatically and provisions HTTPS. Preserve existing email-related DNS records when changing DNS manually.

## Backups

Back up these three items together:

1. The managed MySQL database, including `site_content`, `site_images`, and `site_image_chunks`.
2. `public/assets/customer-documents` from GoDaddy File Manager.
3. `FILE_ENCRYPTION_SECRET` in a secure password manager.

Keep any legacy `public/assets/site-images` backup until those images have been imported into MySQL. New project-image uploads no longer depend on that folder.

An encrypted document backup is unusable without the same encryption secret.
