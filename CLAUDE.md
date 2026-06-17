# CLAUDE.md

Este archivo proporciona guía a Claude Code (claude.ai/code) al trabajar con código en este repositorio.

## Comandos

```bash
npm run setup          # Configuración inicial: instala dependencias, genera el cliente de Prisma, ejecuta migraciones
npm run dev            # Inicia el servidor de desarrollo con Turbopack en http://localhost:3000
npm run build          # Build de producción
npm run test           # Ejecuta todos los tests (Vitest + jsdom)
npm run lint           # ESLint
npm run db:reset       # Reinicia la base de datos SQLite (destructivo)
```

Ejecutar un único archivo de test:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

**No ejecutar `npm audit fix`** — las dependencias están fijadas a versiones compatibles específicas.

## Arquitectura

UIGen es un generador de componentes React impulsado por IA. Los usuarios describen componentes en una interfaz de chat; la IA los genera en un sistema de archivos virtual y se previsualizan en vivo en un iframe — nunca se escriben archivos en disco.

### Flujo de una solicitud

1. El usuario envía un mensaje en `ChatInterface`
2. `ChatProvider` (`src/lib/contexts/chat-context.tsx`) llama a `POST /api/chat` mediante `useChat` del Vercel AI SDK, pasando el sistema de archivos virtual serializado
3. El route handler (`src/app/api/chat/route.ts`) transmite respuestas `streamText` desde `getLanguageModel()` usando dos herramientas: `str_replace_editor` y `file_manager`
4. Las llamadas a herramientas se transmiten de vuelta al cliente; `onToolCall` en `ChatProvider` enruta cada llamada a `handleToolCall` en `FileSystemContext`
5. `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) modifica el `VirtualFileSystem` en memoria e incrementa `refreshTrigger`
6. `PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) reacciona a `refreshTrigger`, transforma todos los archivos mediante Babel standalone, construye un import map de módulos ES con blob URLs, y lo escribe como `srcdoc` en un iframe sandboxed

### Sistema de archivos virtual

`VirtualFileSystem` (`src/lib/file-system.ts`) es un árbol en memoria de objetos `FileNode`. Expone `serialize()` / `deserializeFromNodes()` para el transporte JSON (Map→objeto plano, ya que los Maps no son serializables a JSON). Las dos herramientas de IA operan sobre él:

- `str_replace_editor`: comandos `create`, `str_replace`, `insert`
- `file_manager`: comandos `rename`, `delete`

### Pipeline de previsualización JSX del lado del cliente

`src/lib/transform/jsx-transformer.ts`:
- Transpila cada archivo `.jsx`/`.tsx`/`.ts`/`.js` con Babel standalone (runtime automático de React y preset de TypeScript)
- Elimina los imports de CSS y los acumula como bloques `<style>` inline
- Crea blob URLs para cada módulo transformado
- Construye un `importmap` de módulos ES: React/ReactDOM se fijan a `esm.sh`, los archivos locales usan blob URLs con soporte para el alias `@/`, los paquetes de terceros desconocidos se resuelven automáticamente a `esm.sh/<package>`
- Genera un documento HTML con el import map y un `<script type="module">` que importa el punto de entrada (`/App.jsx` por defecto) y lo monta

### Proveedor de IA

`src/lib/provider.ts` exporta `getLanguageModel()`. Si `ANTHROPIC_API_KEY` está ausente o sigue siendo el placeholder, devuelve un `MockLanguageModel` que transmite componentes predefinidos de contador/formulario/tarjeta. En caso contrario, devuelve `anthropic("claude-haiku-4-5")` vía `@ai-sdk/anthropic`.

El system prompt (`src/lib/prompts/generation.tsx`) instruye al modelo para que:
- Siempre cree `/App.jsx` como punto de entrada del proyecto
- Use el alias de import `@/` para todos los imports de archivos locales (no de librerías)
- Use Tailwind CSS para los estilos (sin estilos hardcodeados)
- Evite crear archivos HTML

### Autenticación y persistencia

- Sesiones JWT vía `jose`, almacenadas como cookie `httpOnly` (`auth-token`), expiración de 7 días (`src/lib/auth.ts`)
- `src/middleware.ts` maneja la verificación de sesión para rutas protegidas
- Prisma + SQLite (`prisma/dev.db`); la salida del cliente generado es `src/generated/prisma/`
- Esquema: `User` (id, email, contraseña bcrypt) → `Project` (los mensajes se almacenan como string JSON, los datos de archivos se almacenan como string JSON del VFS serializado)
- Los proyectos se guardan en el `onFinish` de `streamText` solo cuando hay un `projectId` presente y el usuario está autenticado
- El trabajo de usuarios anónimos se rastrea en `src/lib/anon-work-tracker.ts` (localStorage) para incentivar el registro

### Diseño de la interfaz

`MainContent` (`src/app/main-content.tsx`) configura ambos providers y renderiza un layout de dos paneles redimensionables: chat a la izquierda, pestañas de preview/código a la derecha. La vista de código muestra un `FileTree` y el `CodeEditor` de Monaco lado a lado.

### Testing

Los tests usan Vitest con jsdom y React Testing Library, ubicados en directorios `__tests__/` junto a los módulos que prueban.

## Esquema de base de datos

El esquema de base de datos está definido en el archivo `prisma/schema.prisma`. Haz referencia a él cada vez que necesites entender la estructura de la data almacenada en la base de datos.

## Estilo de código

Usar comentarios con moderación — solo cuando la lógica es compleja o la intención no sería obvia a partir de los nombres.
