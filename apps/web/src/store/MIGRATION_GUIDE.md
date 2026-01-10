# Store Migration Guide

This guide helps migrate from the monolithic `reconciliationStore` to the new domain-specific stores.

## Overview

The monolithic `reconciliationStore` (326 lines, 20+ actions) has been split into 5 focused stores:

```
Before: reconciliationStore (1 store, 20+ actions)
After:
  ├── fileUploadStore         # File upload state
  ├── columnMappingStore      # Column mappings
  ├── workflowStore           # Workflow status
  ├── agentRunStore           # Agent execution
  └── userPreferencesStore    # User settings
```

## Benefits

- **Better Separation of Concerns**: Each store has a single responsibility
- **Improved Performance**: Components only re-render when their specific domain changes
- **Easier Testing**: Test each domain in isolation
- **Clearer API**: Focused actions and state per domain
- **Smaller Bundle**: Import only the stores you need

## Migration Examples

### Example 1: File Upload Component

**Before:**
```typescript
import { useReconciliationStore } from '@/store/reconciliationStore';

function FileUploader() {
  const {
    uploadedFiles,
    setUploadedFile,
    clearUploadedFile,
    updateFileMetadata,
    updateAccountingSystem,
  } = useReconciliationStore();

  const glFile = uploadedFiles.glBalance;

  return (
    <div>
      {glFile && <FileInfo file={glFile} />}
      <UploadButton onClick={(file) => setUploadedFile('gl_balance', file)} />
    </div>
  );
}
```

**After:**
```typescript
import { useFileUploadStore } from '@/store/fileUploadStore';

function FileUploader() {
  const {
    files,
    setFile,
    clearFile,
    updateMetadata,
    updateAccountingSystem,
  } = useFileUploadStore();

  const glFile = files.glBalance;

  return (
    <div>
      {glFile && <FileInfo file={glFile} />}
      <UploadButton onClick={(file) => setFile('gl_balance', file)} />
    </div>
  );
}
```

### Example 2: Column Mapping Component

**Before:**
```typescript
import { useReconciliationStore } from '@/store/reconciliationStore';

function ColumnMapper() {
  const { columnMappings, setColumnMapping } = useReconciliationStore();

  const mapping = columnMappings.gl_balance;

  return (
    <MappingUI
      mapping={mapping}
      onUpdate={(m) => setColumnMapping('gl_balance', m)}
    />
  );
}
```

**After:**
```typescript
import { useColumnMappingStore } from '@/store/columnMappingStore';

function ColumnMapper() {
  const { mappings, setMapping } = useColumnMappingStore();

  const mapping = mappings.gl_balance;

  return (
    <MappingUI
      mapping={mapping}
      onUpdate={(m) => setMapping('gl_balance', m)}
    />
  );
}
```

### Example 3: Workflow Progress Component

**Before:**
```typescript
import { useReconciliationStore } from '@/store/reconciliationStore';

function WorkflowProgress() {
  const { workflowStatus, updateWorkflowStatus } = useReconciliationStore();

  return (
    <div>
      <Step status={workflowStatus.upload}>Upload</Step>
      <Step status={workflowStatus.map}>Map</Step>
      <Step status={workflowStatus.preview}>Preview</Step>
      <Step status={workflowStatus.run}>Run</Step>
    </div>
  );
}
```

**After:**
```typescript
import { useWorkflowStore } from '@/store/workflowStore';

function WorkflowProgress() {
  const { status, updateStep } = useWorkflowStore();

  return (
    <div>
      <Step status={status.upload}>Upload</Step>
      <Step status={status.map}>Map</Step>
      <Step status={status.preview}>Preview</Step>
      <Step status={status.run}>Run</Step>
    </div>
  );
}
```

### Example 4: Agent Run Button

**Before:**
```typescript
import { useReconciliationStore } from '@/store/reconciliationStore';

function RunButton() {
  const { isRunning, startRun, stopRun } = useReconciliationStore();

  const handleRun = () => {
    const abortController = new AbortController();
    startRun(`run_${Date.now()}`, abortController);
    // ... execute agent ...
  };

  return (
    <button onClick={isRunning ? stopRun : handleRun}>
      {isRunning ? 'Cancel' : 'Run'}
    </button>
  );
}
```

**After:**
```typescript
import { useAgentRunStore } from '@/store/agentRunStore';

function RunButton() {
  const { isRunning, startRun, stopRun } = useAgentRunStore();

  const handleRun = () => {
    const abortController = new AbortController();
    startRun(`run_${Date.now()}`, abortController);
    // ... execute agent ...
  };

  return (
    <button onClick={isRunning ? stopRun : handleRun}>
      {isRunning ? 'Cancel' : 'Run'}
    </button>
  );
}
```

### Example 5: Settings Component

**Before:**
```typescript
import { useReconciliationStore } from '@/store/reconciliationStore';

function Settings() {
  const { materialityThreshold, setMaterialityThreshold } = useReconciliationStore();

  return (
    <input
      type="number"
      value={materialityThreshold}
      onChange={(e) => setMaterialityThreshold(Number(e.target.value))}
    />
  );
}
```

**After:**
```typescript
import { useUserPreferencesStore } from '@/store/userPreferencesStore';

function Settings() {
  const { materialityThreshold, setMaterialityThreshold } = useUserPreferencesStore();

  return (
    <input
      type="number"
      value={materialityThreshold}
      onChange={(e) => setMaterialityThreshold(Number(e.target.value))}
    />
  );
}
```

### Example 6: Complex Component Using Multiple Stores

**Before:**
```typescript
import { useReconciliationStore } from '@/store/reconciliationStore';

function Dashboard() {
  const {
    uploadedFiles,
    workflowStatus,
    isRunning,
    materialityThreshold,
  } = useReconciliationStore();

  return (
    <div>
      <FileList files={uploadedFiles} />
      <Progress status={workflowStatus} />
      <RunStatus running={isRunning} />
      <Settings threshold={materialityThreshold} />
    </div>
  );
}
```

**After:**
```typescript
import { useFileUploadStore } from '@/store/fileUploadStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { useAgentRunStore } from '@/store/agentRunStore';
import { useUserPreferencesStore } from '@/store/userPreferencesStore';

function Dashboard() {
  const { files } = useFileUploadStore();
  const { status } = useWorkflowStore();
  const { isRunning } = useAgentRunStore();
  const { materialityThreshold } = useUserPreferencesStore();

  return (
    <div>
      <FileList files={files} />
      <Progress status={status} />
      <RunStatus running={isRunning} />
      <Settings threshold={materialityThreshold} />
    </div>
  );
}
```

## API Changes Reference

### File Upload

| Old API | New API | Notes |
|---------|---------|-------|
| `uploadedFiles` | `files` | Property name changed |
| `setUploadedFile(type, file)` | `setFile(type, file)` | Shorter name |
| `clearUploadedFile(type)` | `clearFile(type)` | Shorter name |
| `clearAllFiles()` | `clearAll()` | Shorter name |
| `updateFileMetadata(type, meta)` | `updateMetadata(type, meta)` | Shorter name |
| `updateAccountingSystem(type, sys)` | `updateAccountingSystem(type, sys)` | Same |
| `reconciliationData` | `reconciliationData` | Same |
| `setReconciliationData(data)` | `setReconciliationData(data)` | Same |
| `clearReconciliationData()` | `clearReconciliationData()` | Same |

### Column Mapping

| Old API | New API | Notes |
|---------|---------|-------|
| `columnMappings` | `mappings` | Shorter name |
| `setColumnMapping(type, map)` | `setMapping(type, map)` | Shorter name |
| `clearColumnMapping(type)` | `clearMapping(type)` | Shorter name |
| - | `clearAll()` | New helper |
| - | `getMapping(type)` | New helper |
| - | `hasMapping(type)` | New helper |

### Workflow

| Old API | New API | Notes |
|---------|---------|-------|
| `workflowStatus` | `status` | Shorter name |
| `updateWorkflowStatus(step, status)` | `updateStep(step, status)` | Shorter name |
| - | `completeStep(step)` | New helper |
| - | `incompleteStep(step)` | New helper |
| - | `isReadyToRun()` | New helper |

### Agent Run

| Old API | New API | Notes |
|---------|---------|-------|
| `isRunning` | `isRunning` | Same |
| `currentRunId` | `currentRunId` | Same |
| `abortController` | `abortController` | Same |
| `startRun(id, ctrl)` | `startRun(id, ctrl)` | Same |
| `stopRun()` | `stopRun()` | Same |
| `completeRun()` | `completeRun()` | Same |

### User Preferences

| Old API | New API | Notes |
|---------|---------|-------|
| `materialityThreshold` | `materialityThreshold` | Same |
| `setMaterialityThreshold(n)` | `setMaterialityThreshold(n)` | Same |

### Global Operations

| Old API | New API | Notes |
|---------|---------|-------|
| `reset()` | `resetAllStores()` | Import from `@/store` |
| `syncWithDatabase()` | *Removed* | Move to API layer |

## Migration Checklist

- [ ] Update file upload components to use `useFileUploadStore`
- [ ] Update column mapping components to use `useColumnMappingStore`
- [ ] Update workflow components to use `useWorkflowStore`
- [ ] Update agent run components to use `useAgentRunStore`
- [ ] Update settings components to use `useUserPreferencesStore`
- [ ] Update tests to import from new stores
- [ ] Replace `reset()` calls with `resetAllStores()`
- [ ] Remove imports of `useReconciliationStore`
- [ ] Test all workflows end-to-end
- [ ] Delete `reconciliationStore.ts` (after migration complete)

## Performance Benefits

With domain-specific stores, components only re-render when their specific domain changes:

**Before:**
```typescript
// Component re-renders whenever ANY part of reconciliationStore changes
const { uploadedFiles } = useReconciliationStore();
```

**After:**
```typescript
// Component only re-renders when files change
const { files } = useFileUploadStore();
```

This leads to:
- Fewer unnecessary re-renders
- Better performance for large components
- Easier to optimize with React.memo

## Testing

Domain-specific stores are easier to test:

```typescript
// Before: Mock entire reconciliationStore
const mockStore = {
  uploadedFiles: { ... },
  columnMappings: { ... },
  workflowStatus: { ... },
  isRunning: false,
  // ... 15 more properties
};

// After: Mock only what you need
const mockFileStore = {
  files: { glBalance: mockFile },
  setFile: jest.fn(),
};
```

## Rollback Plan

If issues arise during migration:

1. Keep `reconciliationStore.ts` until migration is complete
2. Both old and new stores can coexist temporarily
3. Migrate component-by-component, not all at once
4. Test each migrated component thoroughly
5. If needed, revert individual components back to old store

## Questions?

If you encounter issues during migration:

1. Check this guide for examples
2. Review the new store implementations in `apps/web/src/store/`
3. Use TypeScript errors to guide you - the types will tell you what changed
4. Refer to the API Changes Reference table above
