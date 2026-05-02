# Study Sessions — Implementation Plan

Plan detallado para implementar **estudios bíblicos colaborativos en canvas**. Diseñado para ejecutar paso a paso (apto para opencode). Cada fase es independiente y entregable.

---

## 0. Decisiones ya tomadas (no revisitar)

- **Canvas**: `@xyflow/react` (React Flow, MIT). Nodos custom para versículos / pasajes / stickies; edges para flechas conectoras.
- **Sync colaborativo**: **Yjs** + **Hocuspocus** (servidor Node sidecar) sobre WebSocket. Awareness de Yjs para cursores y presencia.
- **Auto-save**: Hocuspocus persiste el `Y.Doc` en MySQL (vía webhook a Laravel) periódicamente y al cerrar sesión. No hay botón "Guardar".
- **Persistencia total**: cada sesión se guarda al terminar; queda accesible para **todos los participantes que hayan estado en ella**.
- **Sin tamaño máximo** de participantes (por ahora).
- **Estética**: top bar = Linear; toolbar flotante = Excalidraw; cursores etiquetados con color por usuario.
- **Notificación de invitación**: nuevo evento `study_invitation` en `PushDispatcher` (FCM ya existe).

---

## 1. Arquitectura

```
┌──────────────────────────────────────────────────────────────────────┐
│                         bible-tauri (cliente)                        │
│  React + React Flow + Yjs cliente + y-websocket + Tiptap (stickies)  │
└────────────┬───────────────────────────────────┬─────────────────────┘
             │ HTTP REST                         │ WebSocket (Yjs binary)
             ▼                                   ▼
┌────────────────────────┐         ┌─────────────────────────────────┐
│   Laravel API (bible)  │◀────────│   Hocuspocus (Node sidecar)     │
│  - REST CRUD sesiones  │ webhook │  - Y.Doc en memoria por room    │
│  - Invitaciones        │ snapshot│  - Auth via JWT Laravel         │
│  - PushDispatcher      │  + auth │  - Persiste vía webhook         │
│  - MySQL               │         │  - Awareness (cursores)         │
└────────────────────────┘         └─────────────────────────────────┘
```

**Room ID = `study_sessions.id` (uuid)**. Un usuario sólo puede conectarse a un room si Laravel certifica su membresía vía JWT incluido en el `connect`.

---

## 2. Stack y dependencias

### Frontend (`bible-tauri`)

```bash
pnpm add @xyflow/react yjs y-websocket @hocuspocus/provider
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor
```

### Hocuspocus sidecar (nuevo repo o subcarpeta `hocuspocus/`)

```bash
mkdir hocuspocus && cd hocuspocus && pnpm init
pnpm add @hocuspocus/server @hocuspocus/extension-database jsonwebtoken axios
pnpm add -D typescript tsx @types/node @types/jsonwebtoken
```

### Backend (`~/Documents/Repos/bible`)

Sin paquetes nuevos. Reusar `kreait/laravel-firebase` (ya instalado).

---

## 3. Modelo de datos (Laravel migrations)

Crear migrations en `database/migrations/`:

```php
// 2026_05_02_000001_create_study_sessions_table.php
Schema::create('study_sessions', function (Blueprint $t) {
    $t->uuid('id')->primary();
    $t->enum('type', ['verse', 'chapter', 'free']);
    $t->string('anchor_ref')->nullable();          // 'juan-3-16', 'romanos-8'
    $t->string('title');
    $t->foreignId('host_user_id')->constrained('users')->cascadeOnDelete();
    $t->enum('status', ['active', 'ended'])->default('active');
    $t->binary('doc_snapshot')->nullable();        // Y.Doc state vector (LONGBLOB)
    $t->string('thumbnail_url')->nullable();
    $t->timestamp('last_activity_at')->useCurrent();
    $t->timestamp('ended_at')->nullable();
    $t->timestamps();
    $t->index(['status', 'last_activity_at']);
});

// 2026_05_02_000002_create_study_session_participants_table.php
Schema::create('study_session_participants', function (Blueprint $t) {
    $t->id();
    $t->uuid('session_id');
    $t->foreign('session_id')->references('id')->on('study_sessions')->cascadeOnDelete();
    $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
    $t->enum('role', ['host', 'editor', 'viewer'])->default('editor');
    $t->string('cursor_color', 7);                 // '#c8a96a'
    $t->timestamp('joined_at')->useCurrent();
    $t->timestamp('left_at')->nullable();
    $t->boolean('is_present')->default(false);     // currently connected via WS
    $t->unique(['session_id', 'user_id']);
    $t->index(['user_id', 'session_id']);
});

// 2026_05_02_000003_create_study_invitations_table.php
Schema::create('study_invitations', function (Blueprint $t) {
    $t->id();
    $t->uuid('session_id');
    $t->foreign('session_id')->references('id')->on('study_sessions')->cascadeOnDelete();
    $t->foreignId('inviter_id')->constrained('users')->cascadeOnDelete();
    $t->foreignId('invitee_id')->constrained('users')->cascadeOnDelete();
    $t->enum('status', ['pending', 'accepted', 'declined', 'expired'])->default('pending');
    $t->timestamps();
    $t->unique(['session_id', 'invitee_id']);
});

// 2026_05_02_000004_add_study_invitation_to_notification_preferences.php
// ALTER notification_preferences ADD COLUMN study_invitation BOOLEAN DEFAULT TRUE
```

**Eloquent models** (`app/Models/`):
- `StudySession.php` — relations: `host()`, `participants()`, `invitations()`
- `StudySessionParticipant.php`
- `StudyInvitation.php`

---

## 4. Endpoints Laravel

Todas bajo `Route::middleware('auth:sanctum')->prefix('api')->group(...)`.

| Método | Ruta | Acción | Notas |
|---|---|---|---|
| `POST` | `/studies` | Crear sesión | body: `{type, anchor_ref?, title}`. Devuelve `{session, ws_token}` |
| `GET` | `/studies` | Listar mis sesiones (activas + terminadas) | filtro `?status=active|ended` |
| `GET` | `/studies/{id}` | Detalle (incluye participantes) | 403 si no fui participante |
| `POST` | `/studies/{id}/join` | Unirse | crea/actualiza participant; devuelve `ws_token` |
| `POST` | `/studies/{id}/leave` | Marcar `left_at`, recalcular `is_present` | |
| `POST` | `/studies/{id}/end` | Sólo host; marca `status=ended` | dispara cleanup |
| `POST` | `/studies/{id}/invite` | body: `{user_ids: []}` | crea invitations + dispara push |
| `GET` | `/studies/invitations` | Mis invitaciones pendientes | |
| `POST` | `/studies/invitations/{id}/accept` | Acepta + auto-join | devuelve `{session, ws_token}` |
| `POST` | `/studies/invitations/{id}/decline` | | |

### Endpoints internos (Hocuspocus → Laravel)

Protegidos con header `X-Hocuspocus-Secret: <env>` en lugar de auth user.

| Método | Ruta | Acción |
|---|---|---|
| `POST` | `/internal/studies/{id}/auth` | Verifica JWT del cliente; devuelve `{user_id, role, allowed: bool}` |
| `PUT` | `/internal/studies/{id}/snapshot` | Body binario = Y.Doc state. Persistir en `doc_snapshot`, actualizar `last_activity_at` |
| `POST` | `/internal/studies/{id}/presence` | body: `{user_id, is_present: bool}` |

### `ws_token` JWT

Firmado con `JWT_SECRET_HOCUSPOCUS` (env). Payload:
```json
{ "sub": user_id, "session_id": "<uuid>", "role": "host|editor|viewer", "exp": now+1h }
```

### `StudyInvitationController::send()` flow

```php
foreach ($userIds as $inviteeId) {
    $inv = StudyInvitation::firstOrCreate([...]);
    if ($inv->wasRecentlyCreated) {
        app(PushDispatcher::class)->send(
            User::find($inviteeId),
            'study_invitation',
            [
                'title' => "{$inviter->name} te invita a un estudio",
                'body'  => $session->title,
                'data'  => ['session_id' => $session->id, 'invitation_id' => $inv->id, 'route' => 'study'],
            ]
        );
    }
}
```

### Cleanup job (`app/Console/Commands/EndIdleStudySessions.php`)

Schedule cada 1 min en `app/Console/Kernel.php`:
```php
$schedule->command('studies:end-idle')->everyMinute();
```

Lógica: sesiones con `status=active` AND `last_activity_at < now() - 10 min` AND sin participantes con `is_present=true` → `status=ended`, `ended_at=now()`.

---

## 5. Hocuspocus sidecar

### Estructura

```
hocuspocus/
  package.json
  tsconfig.json
  src/
    server.ts
    laravel.ts        # cliente HTTP a Laravel
    auth.ts           # verifica JWT
```

### `hocuspocus/src/server.ts`

```typescript
import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import jwt from 'jsonwebtoken';
import { laravel } from './laravel';

const PORT = Number(process.env.PORT ?? 1234);
const SECRET = process.env.JWT_SECRET_HOCUSPOCUS!;

const server = new Server({
  port: PORT,
  async onAuthenticate({ token, documentName }) {
    const payload = jwt.verify(token, SECRET) as any;
    if (payload.session_id !== documentName) throw new Error('session mismatch');
    // Verify with Laravel (in case role/membership changed)
    const ok = await laravel.authCheck(documentName, token);
    if (!ok.allowed) throw new Error('forbidden');
    return { user: { id: payload.sub, name: ok.name, color: ok.color, role: payload.role } };
  },
  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        const snap = await laravel.fetchSnapshot(documentName);
        return snap; // Uint8Array | null
      },
      store: async ({ documentName, state }) => {
        await laravel.putSnapshot(documentName, state);
      },
    }),
  ],
  async onConnect({ documentName, context }) {
    await laravel.setPresence(documentName, context.user.id, true);
  },
  async onDisconnect({ documentName, context }) {
    await laravel.setPresence(documentName, context.user.id, false);
  },
});

server.listen();
```

### `hocuspocus/src/laravel.ts`

```typescript
import axios from 'axios';

const API = process.env.LARAVEL_API_URL!;
const SECRET = process.env.HOCUSPOCUS_SHARED_SECRET!;
const headers = { 'X-Hocuspocus-Secret': SECRET };

export const laravel = {
  async authCheck(sessionId: string, token: string) {
    const r = await axios.post(`${API}/internal/studies/${sessionId}/auth`, { token }, { headers });
    return r.data;
  },
  async fetchSnapshot(sessionId: string): Promise<Uint8Array | null> {
    const r = await axios.get(`${API}/internal/studies/${sessionId}/snapshot`, { headers, responseType: 'arraybuffer', validateStatus: () => true });
    if (r.status !== 200 || !r.data?.byteLength) return null;
    return new Uint8Array(r.data);
  },
  async putSnapshot(sessionId: string, state: Uint8Array) {
    await axios.put(`${API}/internal/studies/${sessionId}/snapshot`, state, {
      headers: { ...headers, 'Content-Type': 'application/octet-stream' },
    });
  },
  async setPresence(sessionId: string, userId: number, isPresent: boolean) {
    await axios.post(`${API}/internal/studies/${sessionId}/presence`, { user_id: userId, is_present: isPresent }, { headers });
  },
};
```

### Despliegue en Contabo

Supervisor program nuevo (`/etc/supervisor/conf.d/hocuspocus.conf`):
```ini
[program:hocuspocus]
command=/usr/bin/node /var/www/hocuspocus/dist/server.js
autostart=true
autorestart=true
user=www-data
environment=PORT=1234,JWT_SECRET_HOCUSPOCUS="...",LARAVEL_API_URL="http://127.0.0.1/api",HOCUSPOCUS_SHARED_SECRET="..."
stdout_logfile=/var/log/hocuspocus.log
```

Nginx: subdominio `wss://study-sync.tulia.study` → `proxy_pass http://127.0.0.1:1234` con `Upgrade` headers.

### Frontend env

```env
VITE_HOCUSPOCUS_URL=wss://study-sync.tulia.study
# dev: VITE_HOCUSPOCUS_URL=ws://localhost:1234
```

---

## 6. Frontend — estructura de archivos

```
src/
  lib/
    study/
      hocuspocusClient.ts       # crea HocuspocusProvider por session
      colors.ts                 # paleta de cursor colors
      yDocHelpers.ts            # init shared structures
      studyApi.ts               # REST helpers
    store/
      useStudyStore.ts          # NEW
  components/
    study/
      StudyMode.tsx             # takeover layout (root del modo estudio)
      StudyTopBar.tsx           # Linear-style header
      StudyToolbar.tsx          # floating Excalidraw-style
      StudyCanvas.tsx           # React Flow + Yjs glue
      StudyParticipants.tsx     # avatar stack
      InviteModal.tsx
      StartStudyModal.tsx       # picker (verse / chapter / free)
      MyStudiesPanel.tsx        # lista guardadas en sidebar
      InvitationToast.tsx
      nodes/
        VerseNode.tsx
        PassageNode.tsx
        StickyNode.tsx
        CommentNode.tsx
      edges/
        ArrowEdge.tsx
      cursor/
        RemoteCursor.tsx
        useCursorAwareness.ts
  hooks/
    useStudySession.ts          # bootstrap provider + Y.Doc
```

---

## 7. Plan por fases

> Cada fase tiene: **objetivo**, **archivos**, **acceptance criteria**. Ejecutar en orden.

---

### **Fase 0 — Spike técnico** *(0.5 día)*

**Objetivo**: Hocuspocus corriendo local, 2 pestañas sincronizando un Y.Doc trivial.

1. Crear carpeta `hocuspocus/` con código de §5. `pnpm dev` (`tsx watch src/server.ts`).
2. En `bible-tauri`, página de prueba `/study-spike` (temporal): crea `HocuspocusProvider` con room hardcoded y un `Y.Map`; muestra `JSON.stringify(map.toJSON())`.
3. Stub temporal de los endpoints `/internal/studies/...` en Laravel devolviendo `{allowed: true}`.

**AC**: abrir 2 pestañas, escribir en una, ver actualización en la otra.

---

### **Fase 1 — Backend: modelos, endpoints, cleanup** *(1 día)*

**Objetivo**: Laravel sirve toda la API REST + endpoints internos.

1. Migrations §3.
2. Models con relaciones.
3. `app/Http/Controllers/StudyController.php` — todos los endpoints de §4 menos invite.
4. `app/Http/Controllers/StudyInvitationController.php` — invite, accept, decline (sin push aún).
5. `app/Http/Controllers/Internal/HocuspocusController.php` — los 3 endpoints internos. Middleware `EnsureHocuspocusSecret` validando `X-Hocuspocus-Secret`.
6. Helper `StudySession::generateWsToken(User $user): string` → JWT firmado.
7. `app/Console/Commands/EndIdleStudySessions.php` + schedule.
8. Tests: `tests/Feature/StudySessionTest.php` (crear, join, leave, listar).

**AC**: `curl` puede crear sesión, joinear con otro user, recibe `ws_token`. Test suite pasa.

---

### **Fase 2 — Frontend store + START/JOIN flow sin canvas** *(0.5 día)*

**Objetivo**: poder crear y unirse a sesión, ver datos en consola; sin canvas todavía.

1. `src/lib/store/useStudyStore.ts`:
   ```ts
   interface StudyStore {
     activeSession: StudySession | null;
     wsToken: string | null;
     participants: Participant[];
     myStudies: StudySession[];
     pendingInvitations: Invitation[];
     start(input: { type; anchor_ref?; title }): Promise<void>;
     join(sessionId: string): Promise<void>;
     leave(): Promise<void>;
     end(): Promise<void>;
     invite(userIds: number[]): Promise<void>;
     loadMyStudies(): Promise<void>;
     loadInvitations(): Promise<void>;
     acceptInvitation(id: number): Promise<void>;
     declineInvitation(id: number): Promise<void>;
   }
   ```
2. `src/lib/study/studyApi.ts` — wrappers sobre `api.ts`.
3. Botón temporal en `Sidebar` "Iniciar estudio (test)" que abre `StartStudyModal`.
4. `StartStudyModal.tsx` — radio (verse/chapter/free), si verse/chapter input para `anchor_ref`, input title.

**AC**: click crea sesión, navegador muestra `activeSession` en devtools, `ws_token` recibido.

---

### **Fase 3 — Layout takeover + presencia** *(1 día)*

**Objetivo**: al entrar a una sesión, la UI cambia a modo estudio. Sin canvas todavía, pero con top bar, toolbar (botones inertes), avatares, participantes en vivo.

1. `useUIStore` añadir `studyMode: boolean` derivado de `useStudyStore.activeSession != null`.
2. En `App.tsx` (o el root), si `studyMode` → renderiza `<StudyMode />` en vez del layout normal.
3. `StudyMode.tsx`:
   ```
   <div class="fixed inset-0 bg-background flex flex-col">
     <StudyTopBar />
     <div class="flex-1 relative">
       <StudyToolbar />        // absolute left-4 top-1/2 -translate-y-1/2
       <StudyCanvas />         // fase 4 — placeholder gris ahora
     </div>
   </div>
   ```
4. `StudyTopBar.tsx`: botón salir (← Salir), título editable, `<StudyParticipants />`, botón Invitar, botón ⋯ con menú (Terminar sesión).
5. `StudyParticipants.tsx`: stack de avatares (max 5 visibles + "+N"), borde con `cursor_color` de cada participant. Tooltip con nombre.
6. **Conexión Hocuspocus minimal**: `useStudySession()` hook crea `HocuspocusProvider` + Y.Doc, expone `awareness`. En este punto sólo lo usamos para listar usuarios conectados (`awareness.getStates()`).
7. Estilos: top bar con `border-b border-border h-12 px-4`, toolbar con `rounded-2xl bg-surface shadow-lg p-1.5 flex flex-col gap-1`. Iconos lucide-react.

**AC**: 2 navegadores en la misma sesión muestran avatares mutuos en top bar; al cerrar uno, el otro lo ve desaparecer en <2s.

---

### **Fase 4 — React Flow + Yjs sync de nodos/edges** *(1.5 días)*

**Objetivo**: canvas funcional con drag, zoom, pan, undo/redo, sync entre clientes.

1. `StudyCanvas.tsx`:
   ```tsx
   const ydoc = useStudySessionDoc();
   const yNodes = ydoc.getArray<Node>('nodes');
   const yEdges = ydoc.getArray<Edge>('edges');
   const [nodes, setNodes] = useState<Node[]>([]);
   const [edges, setEdges] = useState<Edge[]>([]);

   useEffect(() => {
     const update = () => { setNodes(yNodes.toArray()); setEdges(yEdges.toArray()); };
     yNodes.observe(update); yEdges.observe(update); update();
     return () => { yNodes.unobserve(update); yEdges.unobserve(update); };
   }, [yNodes, yEdges]);

   const onNodesChange = useCallback((changes) => {
     ydoc.transact(() => {
       changes.forEach(applyChangeToYArray(yNodes));
     });
   }, []);
   // idem onEdgesChange, onConnect
   ```
2. **Importante**: `Y.Array` no soporta `update-in-place` para object items. Patrón correcto: usar `Y.Map` por nodo dentro del array, o reemplazar el item completo (`yNodes.delete(idx, 1); yNodes.insert(idx, [newNode])`). Recomendado: helper `nodesYMap` (`Y.Map<Y.Map<any>>` keyed by node.id) y derivar array.
3. Reescribe a estructura `Y.Map<NodeYMap>` keyed by id. Ver `src/lib/study/yDocHelpers.ts`:
   ```ts
   export function getNodesMap(doc: Y.Doc): Y.Map<Y.Map<any>> { return doc.getMap('nodes'); }
   export function getEdgesMap(doc: Y.Doc): Y.Map<Y.Map<any>> { return doc.getMap('edges'); }
   export function nodeFromY(m: Y.Map<any>): Node { return { id: m.get('id'), type: m.get('type'), position: m.get('position'), data: m.get('data') }; }
   export function writeNode(map: Y.Map<Y.Map<any>>, node: Node) { /* set sub-map */ }
   ```
4. Toolbar `StudyToolbar.tsx` — primeras herramientas funcionales:
   - Select (default)
   - Hand (pan mode)
   - Sticky note (click → coloca StickyNode en posición del click)
   - Undo / Redo (Y.UndoManager scoped a nodes+edges)
5. `StickyNode.tsx`: textarea editable, color seleccionable (4 colores). El texto se escribe en `Y.Text` dentro del `Y.Map` del nodo (con Tiptap `Collaboration` extension binding directo a `Y.Text`).
6. Cursores remotos: `useCursorAwareness.ts` setea `awareness.setLocalStateField('cursor', {x, y})` en `onPaneMouseMove`. Renderiza `<RemoteCursor>` por cada awareness state remoto.

**AC**: 2 clientes pueden añadir stickies, moverlos, escribir colaborativamente en uno; cursores visibles.

---

### **Fase 5 — VerseNode + PassageNode + auto-arranque** *(1 día)*

**Objetivo**: el corazón del producto — meter Escritura al canvas.

1. `VerseNode.tsx`:
   ```tsx
   // data: { verseId: number, reference: string, version_id: number }
   // Lee texto del verseStore (cache) o fetch on mount
   <div class="bg-surface border border-border rounded-lg p-3 min-w-[280px] max-w-[400px] shadow-sm">
     <div class="text-2xs text-gold uppercase tracking-wide mb-1">{reference}</div>
     <div class="text-sm leading-relaxed">{text}</div>
     <Handle type="source" position="bottom" /><Handle type="target" position="top" />
   </div>
   ```
2. `PassageNode.tsx`: similar, con header de rango (`Romanos 8:1-11`) y lista de versículos. Scroll interno si >10 versículos.
3. Toolbar añadir botón "Insert Verse" (📖). Click abre `<InsertVerseModal>` con autocomplete (reusa lógica de `useVerseStore.search`). Aceptar → crea `VerseNode` en centro del viewport.
4. Equivalente "Insert Passage" con range picker.
5. **Auto-arranque**: en `StudyCanvas` `useEffect` mount, si `activeSession.type !== 'free'` AND `yNodesMap.size === 0` AND soy host → crear nodo inicial:
   - `verse` → `VerseNode` con `anchor_ref` parseado
   - `chapter` → `PassageNode` con todo el capítulo
6. Cache: si el verseStore no tiene la versión cargada, usar la default del usuario.

**AC**: iniciar estudio desde un versículo abre canvas con ese versículo ya colocado; insertar versículos vía modal funciona y sincroniza.

---

### **Fase 6 — Invitaciones + push notifications** *(0.5 día)*

**Objetivo**: invitar amigos, ellos reciben push, click → unirse.

1. Backend: en `StudyInvitationController::send()`, integrar `PushDispatcher` con event `study_invitation` (snippet en §4).
2. Migration añadir columna `study_invitation` a `notification_preferences` (default true).
3. `InviteModal.tsx`: search input (reusa `useFriendStore.search`), lista de friends con checkbox, botón "Enviar invitaciones".
4. Recepción: extender listener push existente para route `study`. Cuando llega notif con `data.route === 'study'`:
   - Si app en foreground → toast `<InvitationToast>` con botón "Unirse" y "Descartar".
   - Click "Unirse" → `acceptInvitation(id)` → `join(session_id)` → entra a `studyMode`.
5. `useStudyStore.loadInvitations()` polling cada 30s como fallback (hasta que el usuario migre a Reverb event para invitaciones).

**AC**: A invita a B → B (en otro device/navegador) recibe push, click, entra a la misma sesión, ven cursores mutuamente.

---

### **Fase 7 — Auto-save + lista "Mis estudios"** *(0.5 día)*

**Objetivo**: recuperar sesiones pasadas.

1. Auto-save ya está implícito (Hocuspocus persiste). Verificar: cerrar todos los clientes, esperar 10min, command de cleanup marca `ended`. Reabrir → `doc_snapshot` se restaura.
2. `MyStudiesPanel.tsx` — sección en sidebar "Mis estudios" (collapsible). Lista paginada de `useStudyStore.myStudies`. Cada item: thumbnail (placeholder), title, fecha, badge "activa" si status=active.
3. Click en estudio activo → `join(id)`. Click en terminado → modal "Reabrir como nueva sesión" (crea nueva session con `doc_snapshot` clonado del original).
4. Backend: endpoint `POST /studies/{id}/reopen` — duplica session con nuevo id y copia `doc_snapshot`.
5. **Thumbnail**: al guardar (cada N minutos en cliente), tomar screenshot del React Flow viewport (`html-to-image` package, MIT) y subir a `POST /studies/{id}/thumbnail` (multipart). Storage en `storage/app/public/study-thumbnails/`.

**AC**: cerrar sesión → 10 min después aparece en "Mis estudios" terminados con thumbnail. Reabrir restaura todos los nodos.

---

### **Fase 8 — Herramientas avanzadas** *(2-3 días, opcional MVP)*

Por orden de valor:

1. **Arrow connector edges** custom (`ArrowEdge.tsx`) — flecha con label editable.
2. **Cross References tool**: panel lateral derecho que al seleccionar `VerseNode` muestra refs cruzadas (reusa `useCrossRefStore`). Click → coloca nuevo VerseNode + edge automático.
3. **Compare Versions node**: `CompareNode` con 2-3 columnas, una versión por columna del mismo versículo.
4. **Comment pins** (`CommentNode`): pin con avatar + hilo. Hilo en `Y.Array<Y.Map>` con replies.
5. **Reactions efímeras**: emoji que aparece sobre cursor 2s. Pasa por awareness, no por doc.
6. **Templates**: al crear sesión `type=free`, dropdown "Plantilla" con "Inductive (OIA)", "Word study", etc. Crea frames + stickies pre-poblados.
7. **Laser pointer (L)**: awareness state + render rojo translúcido, fade out.
8. **Freehand (perfect-freehand)**: capa SVG sobre React Flow, paths sincronizados via `Y.Array<Y.Array<[x,y,pressure]>>`.

---

### **Fase 9 — Pulido UI (Linear + Excalidraw)** *(1 día)*

1. Top bar exacto a Linear: 48px, `border-b border-border/60`, transición opacity al entrar/salir.
2. Toolbar Excalidraw-style: cápsula `rounded-2xl`, `bg-surface/90 backdrop-blur`, sombra suave, separadores entre grupos. Tooltip con nombre + atajo (`V`, `H`, etc.).
3. Avatar stack: animación al unirse alguien (slide-in from right).
4. Cursor labels: pill `rounded-full px-2 py-0.5 text-2xs` con color del usuario, posicionado top-left del cursor.
5. Empty state del canvas: ilustración sutil "Empieza añadiendo un versículo o una nota".
6. Atajos globales (`useEffect` keydown): V/H/T/N (sticky)/V (verse)/Cmd+Z/Cmd+Shift+Z/Esc (deselect).
7. Cheat sheet `Cmd+/` modal.

---

## 8. Riesgos y notas para opencode

- **Y.Array de objetos**: nunca mutar in-place. Siempre `Y.Map` por entidad o reemplazo completo. Patrón documentado en `yDocHelpers.ts` (Fase 4 punto 3) — **respetar**.
- **React Flow controlado vs uncontrolled**: usamos *controlled* (`nodes` + `onNodesChange` desde Yjs). NO usar `useNodesState` builtin — entra en conflicto con Yjs como source of truth.
- **Re-renders**: derivar `nodes`/`edges` de Y.Map es costoso si la lista crece. Usar `useSyncExternalStore` o memoizar por id.
- **Auth WS**: el JWT debe pasarse como `token` en `HocuspocusProvider` constructor, no como query param.
- **CORS para `study-sync.tulia.study`**: añadir al CORS de Laravel si los endpoints internos se llaman desde subdominio (no es el caso si Hocuspocus llama al loopback).
- **Tauri**: WebSocket WSS funciona nativo; no requiere config extra.
- **Mobile responsive**: el modo estudio en móvil queda fuera de scope MVP. Detectar viewport <768px → mensaje "Estudios disponibles en escritorio".
- **No usar emojis en código**. Sólo en UI cuando el usuario los espere (reactions, etc.).
- **Tests**: cada fase de backend incluye un Feature test mínimo. Frontend sin tests por ahora salvo que el usuario los pida.

---

## 9. Variables de entorno

### `bible-tauri/.env.local`
```
VITE_HOCUSPOCUS_URL=ws://localhost:1234
```

### `bible/.env`
```
JWT_SECRET_HOCUSPOCUS=<openssl rand -hex 32>
HOCUSPOCUS_SHARED_SECRET=<openssl rand -hex 32>
```

### `hocuspocus/.env`
```
PORT=1234
JWT_SECRET_HOCUSPOCUS=<same as bible/.env>
HOCUSPOCUS_SHARED_SECRET=<same as bible/.env>
LARAVEL_API_URL=http://localhost:8080/api
```

---

## 10. Checklist de entrega MVP (Fases 0-7)

- [ ] Hocuspocus corriendo en local + producción
- [ ] Migrations aplicadas
- [ ] Endpoints REST + tests
- [ ] Endpoints internos protegidos por shared secret
- [ ] Cleanup command corriendo en schedule
- [ ] `useStudyStore` funcional
- [ ] Layout takeover con top bar + toolbar + avatares
- [ ] React Flow con sticky notes sincronizando
- [ ] Cursores remotos visibles
- [ ] VerseNode + PassageNode + auto-arranque por tipo
- [ ] Invitaciones con push FCM
- [ ] Mis estudios + reapertura
- [ ] Estilos Linear/Excalidraw aplicados

Fase 8-9 son post-MVP.
