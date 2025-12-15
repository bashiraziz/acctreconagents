# File Management Guide

## How to Remove or Replace Uploaded Files

The application now has a dedicated **"Active Files"** section that appears after you upload files.

### Features:

### 1. View Currently Uploaded Files

Once you upload CSV files, an **"Active Files"** panel appears at the top of the Upload Workspace showing:

- 📊 **GL Balance** file (if uploaded)
- 📋 **Subledger Balance** file (if uploaded)
- 💳 **Transactions** file (if uploaded)

Each entry displays:
- File name
- Row count
- Column count

### 2. Remove Individual Files

Each file has a **"Remove"** button that:
- Removes the file from the store
- Clears associated column mappings
- Resets workflow status
- Allows you to upload a new file of that type

**To remove a single file:**
1. Click the red **"Remove"** button next to the file you want to delete
2. The file is instantly removed (no confirmation needed)
3. Upload a new file of the same type if desired

### 3. Clear All Files

There's a **"Clear All"** button at the top right of the Active Files panel that:
- Removes ALL uploaded files at once
- Clears ALL column mappings
- Resets the entire workflow
- Shows a confirmation dialog before proceeding

**To clear all files:**
1. Click the **"Clear All"** button
2. Confirm the action in the dialog
3. All files and mappings are cleared

### 4. Replace a File

**To replace an existing file:**

**Option A - Remove then Upload (Recommended):**
1. Click **"Remove"** on the file you want to replace
2. Select the new file type in the dropdown
3. Drag and drop or click to upload the new file

**Option B - Direct Replace:**
1. Select the file type in the dropdown (e.g., "GL Trial Balance")
2. Upload a new file
3. The new file will **automatically replace** the old one

**Note:** Replacing a file will clear its column mappings and require you to remap columns.

### Visual Indicators:

- **File Type Dropdown**: Shows a **✓** checkmark next to file types that have files uploaded
  - ✓ GL Trial Balance (file uploaded)
  - ✓ Subledger Balance (AP/AR Aging) (file uploaded)
  - Transaction Detail (no file)

### Workflow Impact:

When you remove files, the workflow status automatically resets:

| Action | Impact |
|--------|--------|
| Remove single file | Upload → Incomplete, Map → Incomplete, Preview → Incomplete |
| Clear all files | All workflow steps reset to initial state |
| Replace file | Column mappings for that file type are cleared |

### Example Workflow:

1. **Upload test files** (balanced set)
2. **Map columns** and run reconciliation
3. **Test complete** - want to try unbalanced set
4. Click **"Clear All"** to remove all files
5. Upload new test files (unbalanced set)
6. Remap columns and run again

---

## Best Practices:

✅ **DO:**
- Use "Remove" for single file replacement
- Use "Clear All" when switching test scenarios
- Check the Active Files panel to see what's currently uploaded
- Look for ✓ checkmarks in the file type dropdown

❌ **DON'T:**
- Forget to remap columns after replacing files
- Upload files without selecting the correct file type first
- Assume old mappings will work with new files

---

## Keyboard Shortcuts:

None currently - all file management is done through UI buttons.

---

## Troubleshooting:

**Q: I uploaded a new file but don't see it in Active Files?**
- Make sure you selected the correct file type in the dropdown before uploading
- Check that the file is a valid CSV and parsed successfully
- Look at the upload list below to see if there were any errors

**Q: Can I upload the same file to multiple file types?**
- Yes, but each copy will be stored separately
- This is not recommended as it may cause confusion during reconciliation

**Q: What happens to my column mappings when I remove a file?**
- Column mappings for that specific file type are cleared
- Other file types' mappings remain intact
- You'll need to remap when you upload a new file

**Q: Will my files be saved if I refresh the page?**
- Files are stored in browser localStorage (for anonymous users)
- They will persist across page refreshes
- They will be lost if you clear browser data
- Authenticated users can save mappings to database (files are still in memory only)
