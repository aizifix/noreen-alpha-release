# Event Component React Key Fix

## Issue Resolved

Fixed React key errors in the client event components section:

```
Encountered two children with the same key, `0`. Keys should be unique so that components maintain their identity across updates.
```

## Fix Details

### 1. Database Component IDs

- Created and ran `fix_duplicate_component_ids.sql` to:
  - Check for components with ID = 0
  - Fix any duplicate component IDs
  - Verify no remaining duplicate IDs

### 2. React Code Fix

Made three critical changes to `app/(authenticated)/client/events/[id]/page.tsx`:

1. **Changed temporary ID generation for new components**:

   ```javascript
   // Before:
   component_id: Date.now(), // Temporary ID

   // After:
   component_id: -1 * Date.now(), // Temporary negative ID (avoids conflicts with database IDs)
   ```

   By using negative IDs for temporary components, we ensure they never conflict with real database IDs.

2. **Improved React key generation for components**:

   ```javascript
   // Before:
   key={
     component?.component_id && component.component_id !== 0
       ? `component-${component.component_id}`
       : `component-temp-${index}-${component?.component_name || component?.name || "unnamed"}`
   }

   // After:
   key={
     component?.component_id
       ? `component-${component.component_id}`
       : `component-temp-${index}-${Date.now()}`
   }
   ```

   - Removed the zero check which could cause duplicate keys
   - Added timestamp to temp keys for uniqueness

3. **Similar fix for dropdown anchors**:

   ```javascript
   // Before:
   key={
     component?.component_id && component.component_id !== 0
       ? `dropdown-anchor-${component.component_id}`
       : `dropdown-anchor-temp-${index}`
   }

   // After:
   key={
     component?.component_id
       ? `dropdown-anchor-${component.component_id}`
       : `dropdown-anchor-temp-${index}-${Date.now()}`
   }
   ```

## Root Cause

The issue occurred because:

1. The React code was checking for `component_id !== 0`, causing all components with ID = 0 to be treated as if they had the same key
2. New components were using `Date.now()` as temporary IDs, which could theoretically conflict with database IDs
3. Temporary components had keys that weren't guaranteed unique

## Prevention

- Use negative IDs for temporary components to prevent conflicts with database
- Add timestamps to temporary keys to ensure uniqueness
- Remove the zero check which was causing duplicate keys
