# Feature 05: Next.js Frontend UI, Zapier Builder Flow & Sonner Notifications

**Status**: `DONE`  
**Related Master Plan Section**: Phase 4 — Next.js Visual DAG Builder & Frontend  
**Related Task ID**: TSK-005, TSK-027 through TSK-033  
**Implementation Date**: 2026-08-18  

---

## 🎨 Visual DAG Builder Overhaul (Zapier Alignment)

The visual workflow canvas at `/workflows/[id]` matches the exact Zapier reference layout and flow:

1. **Vertical 1-Way Linear Flow**:
   - Nodes align vertically (`Position.Top` input handle and `Position.Bottom` output handle).
   - Strict 1-way DAG pipeline rules prevent multi-branch splits.
2. **Centered `+ Add step` Button & Vertical Line Stems**:
   - `CustomEdge.tsx`: Renders glowing purple `+` button in exact geometric center of vertical connection line.
   - `CustomNode.tsx`: Renders vertical line stem extending 56px downwards from bottom node with centered `+` button.
3. **Zapier-Style 3-Tab Step Drawer (`FieldMapper.tsx`)**:
   - **`Setup`**: App Card with `[ Change ]`, Action Event dropdown, Account selector (`anil.anuragee@aripratech.com`) with `[ Change ]` / `[ Sign in ]` button and security encryption notice.
   - **`Configure`**: AutoFlow Schedule Trigger Configurator (Daily, Weekly, Specific Date & Time, Cron, Webhook URL) and interactive output variable pills (`+ Body Text`, `+ Sender Email`, `+ AI Result`).
   - **`Test`**: `[ Test Step ]` execution runner with JSON log response viewer.
4. **Zapier-Style App Selector Modal (`AppPickerModal.tsx`)**:
   - Search bar (`Search 9,000+ apps and tools...`).
   - Category sidebar (`Home`, `Apps`, `AI`, `Flow controls`, `Utilities`, `Products`).
   - Grids for **Your top apps** and **Popular built-in tools**.
5. **Step Card 3-Dots Context Menu (`CustomNodes.tsx`)**:
   - Options: ✏️ `Rename Step`, ⚙️ `Edit Configuration`, 📋 `Duplicate Step`, 🗑️ `Delete Step`.
   - **Protection Guard**: `1. AutoFlow Schedule Trigger` node is strictly protected and CANNOT be deleted.
   - **Click-Outside Dismissal**: Window capture-phase listeners (`window.addEventListener('click', ..., true)`) close the menu when clicking anywhere outside.
6. **Template vs. New Workflow Initialization**:
   - `/workflows/new`: Initialized with 1 single default trigger node (`1. AutoFlow Schedule Trigger`).
   - `/workflows/wf_101`, `wf_102`, `wf_103`: Automatically loads pre-configured multi-step DAG templates.

---

## 🧪 Verification Status
- **Frontend TypeScript compilation (`npx tsc --noEmit`)**: **0 errors**.
- **Automated test suite (`npm run test`)**: **17 PASSED | 0 FAILED**.
