

## Plan: Migrate Storage to Cloudflare R2 and Fix Build Errors

### Current State
- **TCOmeus.tsx** has 60+ build errors: missing imports (`supabase`, `BUCKET_NAME`, `AlertDialog`, `Dialog`, `RefreshCw`, `Trash2`, `FileEdit`, `Users`, `PdfToWordConversionDialog`, `deleteTCO`, etc.) and references to undefined types (`StructuredGupm`, `OfficerInfo`, `ExtractedRgpms`)
- TCOmeus currently tries to list/view/download/delete files from **Supabase Storage** — which doesn't have the files
- Netlify functions already exist for R2: `upload-url.ts`, `download-url.ts`, `list-tcos.ts`
- Missing: a **delete** Netlify function for R2

### Changes

#### 1. Create `netlify/functions/delete-tco.ts`
- New Netlify function that deletes a file from R2 by key using `DeleteObjectCommand`
- Accepts POST with `{ fileName: string }`

#### 2. Create `src/lib/r2Storage.ts` — R2 helper module
- Centralized functions to call the Netlify functions:
  - `r2ListTcos(userId)` → calls `/.netlify/functions/list-tcos?userId=...`
  - `r2GetDownloadUrl(fileName)` → calls `/.netlify/functions/download-url`
  - `r2GetUploadUrl(fileName, fileType)` → calls `/.netlify/functions/upload-url`
  - `r2DeleteTco(fileName)` → calls `/.netlify/functions/delete-tco`

#### 3. Rewrite `src/components/tco/TCOmeus.tsx`
- Add all missing imports: `AlertDialog*`, `Dialog*`, `RefreshCw`, `Trash2`, `FileEdit`, `Users`, `PdfToWordConversionDialog`
- Remove all Supabase Storage references (`supabase`, `BUCKET_NAME`)
- Remove undefined types (`StructuredGupm`, `OfficerInfo`, `ExtractedRgpms`) and the GUPM fetching logic (it references a `police_officers` table that doesn't exist)
- Simplify `TcoData` to include `fileKey` (R2 key) and optional `docxKey`
- Update `fetchAllTcos` → use `r2ListTcos(user.id)` 
- Update `handleViewPdf` / `handleDownloadPdf` → use `r2GetDownloadUrl`
- Update `handleDeleteTco` → use `r2DeleteTco`
- Fix polling interval from 1 second to 30 seconds (1s is excessive)

#### 4. Update `src/components/tco/TCOForm.tsx` — Upload DOCX to R2 after generation
- After `handleDownloadWord` generates the DOCX, also upload it to R2:
  1. Get presigned upload URL via `r2GetUploadUrl`
  2. PUT the DOCX blob to that URL
  3. Also upload a `.json` metadata sidecar with tcoNumber, natureza, savedAt, etc.
- This way TCOmeus can list the saved TCOs from R2

### Technical Notes
- The Netlify functions base URL will be auto-detected (`/.netlify/functions/`)
- R2 credentials (endpoint, access key, secret, bucket) are configured as Netlify environment variables — no changes needed there
- Photos upload via `supabasePhotos.ts` remains on Supabase Storage (separate concern)

