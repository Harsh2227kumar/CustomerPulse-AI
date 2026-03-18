# CustomerPulse AI

CustomerPulse AI is an AI-powered complaint intelligence and operations platform for BFSI-style support workflows.

It combines:
- multi-role complaint operations (agent/supervisor/manager/admin),
- AI-assisted triage and communication,
- SLA prediction and monitoring,
- compliance-oriented reporting,
- and public ticket tracking.

---

## 1) Product Goal and Scope

CustomerPulse AI solves common complaint-handling problems:
- delayed manual triage,
- non-standard responses,
- limited manager visibility,
- weak SLA risk detection,
- and poor end-customer status transparency.

The platform turns complaint operations into a structured, auditable workflow with AI support at each stage:
1. complaint intake,
2. AI analysis and optional auto-routing,
3. agent collaboration and communication,
4. SLA risk monitoring,
5. manager analytics and reporting.

---

## 2) High-Level Architecture

### Frontend
- React + TypeScript + Vite
- React Router for page-level navigation
- TanStack React Query for query/mutation state
- shadcn-ui/Radix UI + Tailwind CSS for UI system

### Backend
- Supabase Postgres (data + RLS)
- Supabase Auth (user session + signup/signin)
- Supabase Edge Functions (AI + automation + tracking)

### AI/NLP Layer
- OpenRouter-compatible AI Gateway (`AI_GATEWAY_URL`)
- Model used in all AI edge functions: `google/gemini-3-flash-preview`
- Structured outputs via tool-calling in multiple functions
- Streaming SSE for assistant chat

---

## 3) Route and Page Deep Dive (Every Page)

The app routes are declared in `src/App.tsx`.

## Public routes

### `/login` → `LoginPage`
Purpose:
- authentication entry point for internal users.

UI behavior:
- toggles between Sign In and Sign Up modes.
- signup supports role choice (`agent` or `manager`).

Important functions:
- `handleSubmit(e)`
	- Sign Up path: calls `signUp(email, password, fullName, selectedRole)`.
	- Sign In path: calls `signIn(email, password)`, then navigates to `/`.
	- manager signup shows approval-required notice.

Data and integrations:
- auth actions come from `useAuth()`.
- toasts via `sonner`.

---

### `/track` → `TrackComplaintPage`
Purpose:
- public ticket tracking for customers.

UI behavior:
- form accepts ticket format `CMP-YYYY-NNNNNN`.
- shows complaint status card, progress timeline, and communication history.

Important functions:
- `handleTrack(e)`
	- invokes edge function `track-complaint` with `{ ticket_id }`.
	- handles not-found and transport errors.
- local derived state:
	- `currentStepIndex` for timeline progression,
	- `statusInfo` from `statusConfig` map.

Data and integrations:
- `supabase.functions.invoke('track-complaint')`.

---

## Protected routes

All protected routes are wrapped by `ProtectedRoute`.

### `/` → `DashboardPage`
Purpose:
- daily complaint operations console.

Main sections:
- KPI cards,
- filter + sort toolbar,
- responsive complaint listing (mobile cards + desktop table),
- `PredictiveSLAWidget` in sidebar.

Important functions and logic:
- `priorityOrder(p)` (file-level helper): priority rank mapping.
- `handleSort(key)`: toggles sort key/direction.
- `clearFilters()`: resets filter states.
- `useMemo` complaint scoping:
	- supervisors see all complaints,
	- non-supervisors see assigned-to-self, created-by-self, matching profile full name, or unassigned.
- `useMemo` filtered/sorted dataset using:
	- `statusFilter`, `severityFilter`, `categoryFilter`, `sortKey`, `sortAsc`.

Data and integrations:
- `useComplaints()`.
- auth context from `useAuth()`.

---

### `/complaint/:id` → `ComplaintDetailPage`
Purpose:
- complete case workspace for one complaint.

Main sections:
- complaint header + quick status update + escalate action,
- complaint body and metadata,
- AI analysis panel,
- AI response generation,
- threaded conversation + composer,
- customer and SLA side cards,
- agent assignment (supervisor+),
- duplicate detection,
- audit trail timeline.

Important functions and logic:
- status `Select` `onValueChange`:
	- `updateComplaint.mutate({ id, status })`.
- escalate button action:
	- sets `{ priority: 'critical', status: 'in_progress' }`.
- uses loading skeletons and not-found fallback.

Data and integrations:
- `useComplaint(id)`, `useComplaintMessages(id)`, `useAuditLog(id)`.
- `useUpdateComplaint()` mutation.
- child components: `AgentAssignment`, `AIResponseGenerator`, `DuplicateDetector`, `MessageComposer`.

---

### `/new-complaint` → `NewComplaintPage`
Purpose:
- structured complaint intake form.

Validation:
- Zod schema `complaintSchema` validates all required fields.
- integrates React Hook Form with `zodResolver`.

Important functions:
- `onSubmit(data)`:
	- calls `createComplaint.mutateAsync(...)`.
	- on success shows toast and navigates to dashboard.

Data and integrations:
- `useCreateComplaint()`; AI analysis is triggered asynchronously after insert by the hook.

---

### `/analytics` → `AnalyticsPage`
Access:
- `admin`, `manager`, `supervisor`.

Purpose:
- strategic insights + visual analytics + AI assistant hub.

Main sections:
- KPI cards,
- tabs:
	- `AI Insights` (`AIInsightsPanel`),
	- `AI Assistant` (`AIAgentChat`),
	- `Charts` (volume/category/sentiment/SLA/leaderboard).

Important functions and logic:
- `stats` memo computes:
	- total/resolved/SLA compliance,
	- 7-day volume,
	- category and sentiment distributions,
	- per-agent snapshot metrics.

Note:
- average resolution field currently uses fixed illustrative fallback (`18.5`) when resolved count exists.

---

### `/reports` → `ReportsPage`
Access:
- `admin`, `manager`, `supervisor`.

Purpose:
- compliance and operations reporting (including RBI-style annexure summary).

Main sections:
- period selector,
- RBI Annexure tab,
- SLA Breach tab,
- CSV/PDF export actions.

Important functions:
- `exportCSV(data, filename)`: converts complaint rows to CSV and downloads.
- `exportPDF(data, title)`: generates PDF using `jspdf` + `jspdf-autotable`.
- `downloadFile(...)`: browser Blob download utility.
- `getMostCommon(arr)`: helper for highest-frequency category.

Core memos:
- `filteredComplaints`, `slaBreached`, `annexureStats`.

---

### `/performance` → `AgentPerformancePage`
Access:
- `admin`, `manager`, `supervisor`.

Purpose:
- quality and productivity scoring for agents.

Main sections:
- team KPI summary cards,
- comparison bar chart,
- top-3 radar chart,
- individual scorecards.

Important functions and logic:
- `scores` memo computes per-agent metrics:
	- handled/resolved/open,
	- avg resolution hours,
	- SLA compliance,
	- first response rate,
	- weighted overall score.
- weighted scoring formula:
	- 30% resolution score,
	- 30% SLA rate,
	- 20% speed score,
	- 20% first response rate.
- `comparisonData` and `radarData` memos for charts.

---

### `/admin` → `AdminPage`
Access:
- `admin`, `manager`.

Purpose:
- control plane for users, operations rules, and system settings.

Tabs and internals:

1. `ApprovalsTab`
- fetches unapproved profiles and role mapping.
- `approve` mutation marks `is_approved = true`.

2. `AgentsTab`
- lists agents and capacity/load.
- supports add/edit (`upsert` mutation) and active toggle (`toggleActive`).
- helper functions: `resetForm()`, `openEdit(agent)`.

3. `SLARulesTab`
- create/update/toggle SLA rules.
- mutations: `upsert`, `toggleActive`.
- helper functions: `resetForm()`, `openEdit(rule)`.

4. `CategoriesTab`
- displays static category catalog from constants.

5. `SettingsTab`
- organization profile form (currently demo-save toast).
- account read-only details.

`AdminPage` also fetches pending approval count for tab badge.

---

### `*` → `NotFound`
Purpose:
- fallback route for unknown paths.

---

### `Index.tsx`
Contains a lightweight landing-style component in codebase, but app routing currently uses `DashboardPage` for `/`.

---

## 4) Auth, Roles, and Access Control (Function-Level)

## `AuthProvider` (`src/hooks/useAuth.tsx`)

State managed:
- `user`, `session`, `profile`, `roles`, `loading`.

Core functions:
- `fetchProfile(userId)` → loads `profiles` record.
- `fetchRoles(userId)` → loads roles from `user_roles`.
- `hasRole(role)` and `hasAnyRole(...roles)`.
- `signIn(email, password)`.
- `signUp(email, password, fullName, role)`; passes role in auth metadata.
- `signOut()`.

Derived auth flags:
- `isApproved`, `isAdmin`, `isManager`, `isSupervisor`, `primaryRole`.

## `ProtectedRoute` (`src/components/auth/ProtectedRoute.tsx`)

Behavior:
- blocks unauthenticated users (redirect `/login`).
- enforces account approval status.
- enforces optional role-based requirements.
- emits toast on forbidden access.

---

## 5) Frontend Hooks and Their Functions

## `useComplaints.ts`
Mapping functions:
- `mapComplaint(row)`
- `mapMessage(row)`
- `mapAgent(row)`

Query hooks:
- `useComplaints()`
	- realtime subscription on `complaints` table,
	- returns ordered complaint list.
- `useComplaint(id)`
- `useComplaintMessages(complaintId)`
- `useAuditLog(complaintId)`
- `useAgents()`
- `useSlaRules()`

Mutation hooks:
- `useCreateComplaint()`
	- inserts complaint,
	- then asynchronously invokes `analyze-complaint`.
- `useUpdateComplaint()`
	- updates complaint,
	- triggers `sla-notifications` for assignment events.
- `useTriggerSlaCheck()`
	- explicitly invokes SLA warning notification logic.

## `useAIFeatures.ts`
- `useGenerateResponse()` → `generate-response`
- `useDetectDuplicates()` → `detect-duplicates`
- `usePredictSlaBreach()` → `predict-sla`
- `useAIInsights()` → `ai-insights`
- `useAIChat()`
	- local message state,
	- streaming parser for SSE/OpenAI-style chunk format,
	- `sendMessage(input)` and `clearChat()`.

## `useNotifications.ts`
- fetches last 30 actionable audit events.
- computes unread count from `localStorage` timestamp.
- realtime subscription to `audit_log` inserts.
- `markAllRead()` updates timestamp and resets counter.

---

## 6) AI Agents, NLP, and Decision Logic

This project has two kinds of “agents”:

1) Human support agents (records in `agents` table), and
2) AI agents/workflows (edge functions + chat assistant).

### NLP/AI capabilities implemented

1. Complaint analysis and triage
- sentiment classification (`positive`, `neutral`, `negative`, `angry`)
- sentiment score
- severity score
- key issue extraction
- draft response generation
- suggested category and priority
- optional auto-routing recommendation

2. Duplicate and pattern detection
- compares incoming complaint against recent unresolved complaints
- returns similarity scores and match types (`duplicate`, `related`, `pattern`)

3. Response generation
- tone-controlled response drafts (`formal`, `empathetic`, `escalation`)
- subject line and key action extraction

4. Predictive SLA breach analytics
- per-ticket risk scores,
- risk level,
- risk factors,
- recommended mitigation actions.

5. AI insights panel
- executive summary,
- trends,
- root causes,
- prioritized recommendations,
- risk alerts,
- workload suggestions.

6. AI assistant chat (streaming)
- chat over live operational context,
- references recent complaints and agent workload,
- built for fast manager/agent decision support.

---

## 7) Supabase Edge Functions (Backend Features in Detail)

All functions use Deno `serve` handlers and CORS support.

## 1) `analyze-complaint`
Input:
- `complaint_id`, `subject`, `body`, `category`, `priority`, `customer_name`.

Core logic:
- fetches active agents and computes available pool (`current_load < max_complaints`),
- sends structured prompt to AI,
- expects tool call `analyze_complaint`.

Writes/side-effects:
- updates complaint AI fields,
- optionally updates category/priority,
- optionally auto-assigns and sets status `assigned`,
- inserts audit logs (`ai_analysis`, `auto_categorize`, `auto_prioritize`, `auto_route`).

Output:
- structured `analysis`, plus `auto_routed` / `auto_categorized` / `auto_prioritized` flags.

## 2) `detect-duplicates`
Input:
- `complaint_id`, `subject`, `body`, `category`, `customer_name`.

Core logic:
- fetches up to 50 recent non-closed complaints (excluding current),
- uses tool call `report_duplicates`.

Output:
- enriched duplicate list with ticket metadata and similarity details.

## 3) `generate-response`
Input:
- complaint context + tone + optional `conversation_history`.

Core logic:
- tone-specific instruction policy,
- uses tool call `generate_response`.

Output:
- `response_text`, `subject_line`, `key_actions`.

## 4) `predict-sla`
Core logic:
- loads currently open complaints,
- loads historical resolved/closed sample,
- computes category-priority baseline resolution times,
- asks AI to predict breaches via tool call `predict_breaches`.

Output:
- risk predictions + summary, enriched with complaint IDs and metadata.

## 5) `ai-insights`
Core logic:
- loads complaints + active agents,
- computes distributions and aggregate operational metrics,
- calls AI via tool `report_insights`.

Output:
- `executive_summary`, `trends`, `root_causes`, `recommendations`, `risk_alerts`, `workload_suggestions`.

## 6) `ai-chat`
Input:
- message history array.

Core logic:
- fetches live complaints and agent context,
- builds rich system prompt,
- forwards to AI gateway in streaming mode.

Output:
- SSE stream (`text/event-stream`) for live assistant tokens.

## 7) `sla-monitor`
Core logic:
- scans open complaints,
- recalculates `sla_hours_remaining`,
- derives `sla_status` as:
	- `breached` when <= 0h,
	- `at_risk` when <= 4h,
	- otherwise `on_track`.

Writes/side-effects:
- patches changed complaint SLA fields,
- writes audit events when entering at-risk/breached state.

## 8) `sla-notifications`
Input:
- `type` as either `sla_warning` or `assignment` plus complaint context.

Core logic:
- logs notification events into `audit_log`.

Additional behavior:
- for SLA warnings, also updates complaint SLA status at thresholds.

## 9) `track-complaint`
Input:
- `ticket_id`.

Core logic:
- validates strict ticket format,
- fetches safe public complaint fields,
- fetches non-internal messages,
- masks customer name before returning.

Output:
- public-safe complaint object and communication history.

---

## 8) Database Schema, RLS, Triggers, and Policies

### Core enum types
- `app_role`
- `complaint_status`
- `complaint_priority`
- `complaint_channel`
- `complaint_category`
- `sentiment_type`
- `sla_status_type`

### Core tables
- `profiles`
- `user_roles`
- `customers`
- `agents`
- `complaints`
- `messages`
- `audit_log`
- `sla_rules`

### Important helper functions (RLS support)
- `has_role(_user_id, _role)`
- `is_assigned_to_complaint(_user_id, _complaint_id)`
- `has_supervisor_access(_user_id)`
- `get_agent_id(_user_id)`

### Key triggers/functions
- `handle_new_user` + trigger `on_auth_user_created`:
	- creates profile and default role on signup.
- `update_updated_at_column` triggers on major tables.
- `generate_ticket_id` + trigger `generate_complaint_ticket_id`.

### RLS pattern (final state)
- role-scoped read/update policies for complaint operations,
- supervisors/managers/admins can view broader scope,
- agents are limited to own assigned/self-created/unassigned contexts in operational tables,
- public tracking bypasses RLS through service role in edge function and explicit field whitelisting.

---

## 9) Shared Components and Functional Responsibility

### Layout
- `AppShell`: shared page scaffold.
- `AppSidebar`: role-aware navigation.
- `Topbar`: page title/actions.
- `NotificationBell`: unread events + mark-read integration.

### Complaint-specific components
- `AgentAssignment`: supervisor assignment UI.
- `AIResponseGenerator`: tone selector + draft generation.
- `DuplicateDetector`: duplicate scan + match list.
- `MessageComposer`: outbound/internal note composer.
- Badge set:
	- `StatusBadge`, `SeverityBadge`, `SentimentBadge`, `CategoryBadge`, `SLABadge`, `ChannelIcon`.

### Analytics/AI components
- `KPICard`: compact KPI presenter.
- `PredictiveSLAWidget`: invokes predictive risk and displays high-risk items.
- `AIInsightsPanel`: manager-facing insights renderer.
- `AIAgentChat`: conversational analytics assistant UI.

---

## 10) End-to-End Operational Flows

### Flow A: New Complaint → AI triage
1. user submits form in `NewComplaintPage`.
2. complaint row inserted via `useCreateComplaint`.
3. hook asynchronously invokes `analyze-complaint`.
4. backend writes sentiment/severity/issues/draft, optionally recategorizes, reprioritizes, routes, and logs audit events.
5. dashboard updates through query invalidation + realtime subscription.

### Flow B: Agent handling a complaint
1. open `ComplaintDetailPage`.
2. review AI analysis and SLA status.
3. generate response (tone-based) and send via composer.
4. update status/escalate/assign as needed.
5. audit log captures key actions.

### Flow C: SLA operations
1. periodic `sla-monitor` recalculates status/hours remaining.
2. warning/breach transitions create audit records.
3. notification bell surfaces events to users.
4. managers review risk in dashboard/performance/analytics.

### Flow D: Public customer tracking
1. customer enters ticket at `/track`.
2. `track-complaint` validates format and returns safe payload.
3. UI renders status progression and communication timeline.

---

## 11) Local Development

Requirements:
- Node.js 18+
- npm

Run:

```sh
npm install
npm run dev
```

Useful scripts:
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview build
- `npm run lint` — ESLint
- `npm run test` — Vitest

---

## 12) Environment and Secrets

Frontend (`.env` style):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Supabase Edge Functions secrets:
- `AI_GATEWAY_API_KEY`
- `AI_GATEWAY_URL` (optional; defaults to OpenRouter chat completions endpoint)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 13) Known Gaps / Improvement Backlog

Current implementation is strong, but these areas are still improvement opportunities:

1. `AdminPage` SLA rule “Any” option currently uses string `any`; this can conflict with enum-backed DB fields if saved directly.
2. `track-complaint` has an extra unused message fetch before uuid-based message fetch.
3. `AnalyticsPage` includes one illustrative hardcoded metric fallback (`avgResolution = 18.5`) when there are resolved complaints.
4. Some settings actions are demo-only (`SettingsTab` save toast).
5. AI pipeline currently has no non-AI fallback path when gateway credits/rate limit are exhausted.

---

## 14) Selected Theme

AI for Customer Experience, Service Operations, and Complaint Resolution (BFSI-focused)
