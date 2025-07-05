# Summary

Queremos crear un servicio que permita a un usuario conectarse con MetaMask y obtener fondos limitados (ej. 0.1 ETH), consultar balances, y transferir fondos entre cuentas desde MetaMask. La interfaz tendrá rutas `/faucet`, `/balance` y `/transfer`, y un icono verde o rojo según el estado del nodo Ethereum. Las pruebas incluyen obtener saldo, enviar fondos y transferir desde MetaMask. La arquitectura incluye una app React en TypeScript con Tailwind y ShadCN, un backend en Node.js con Express y TypeScript, y un nodo Ethereum en Docker con Proof of Authority. El proyecto se inicia con `npm create vite@latest`, se configura Tailwind, se instala ShadCN desde su web, y se crea el backend con rutas: `POST /api/faucet/:address/:amount`, `GET /api/balance/:address`, `GET /api/isAlive`. La ruta de transferencia se hace desde el front con MetaMask. Las pruebas se hacen con `curl` o Postman. El header del front incluye navegación, conexión a MetaMask y verificación periódica del estado del nodo. Se crean los componentes Faucet, Transfer y Balance, con rutas definidas y navegación probada. Se instala `react-hook-form` y `zod` para validación, se crean formularios para cada componente, se hacen las llamadas al backend, y se controlan errores. El faucet pide dirección, transfer dirección y monto, balance solo dirección. Se debe grabar un video con pruebas y un `README.md` con instrucciones. El despliegue puede hacerse en Vercel (front y back), exponiendo el nodo con Ngrok, configurando las variables de entorno, y permitiendo acceso desde MetaMask. También se puede desplegar en AWS creando una cuenta, red, EC2, configurando el nodo sin Docker, bajando los repos, y probando.

# Steps

## 1. Setting frontend up

Has creado un proyecto React con Vite usando TypeScript, luego instalaste Tailwind CSS v3 (que requiere PostCSS como motor de transformación CSS y Autoprefixer para compatibilidad cross-browser como dependencias de desarrollo para procesar y optimizar el CSS), y ejecutaste `npx tailwindcss init -p` que genera los archivos de configuración `tailwind.config.js` (que define qué archivos escanear para encontrar clases CSS y configurar el sistema de purga que elimina CSS no usado) y `postcss.config.js` (que le dice a Vite cómo procesar Tailwind en el pipeline de build). El problema inicial era que Tailwind no aplicaba estilos porque en `tailwind.config.js` la propiedad `content` no incluía las rutas correctas de tus archivos React - necesitaba `"./src/**/*.{js,ts,jsx,tsx}"` para que Tailwind supiera dónde buscar las clases como `text-3xl` y generara solo el CSS que realmente usas (optimización de bundle size). Luego quisiste agregar shadcn/ui, que son componentes pre-construidos (código fuente React copiable, no una librería npm) que usan Tailwind internamente y proporcionan funcionalidad completa (estilos + comportamiento + accesibilidad + variantes de diseño), pero shadcn/ui necesita aliases de importación para funcionar (como `@/components` en lugar de `../../../components` para imports más limpios y relocalizables). Vite moderno usa una arquitectura TypeScript modular (Project References) donde `tsconfig.json` es solo un coordinador (orquestador de múltiples configuraciones) que apunta a `tsconfig.app.json` (configuración específica para tu código React con reglas de linting y paths) y `tsconfig.node.json` (configuración para herramientas de build como Vite con diferentes targets de compilación), así que agregaste `baseUrl: "."` (punto de referencia para rutas relativas) y `paths: {"@/*": ["./src/*"]}` (mapeo de alias) en `tsconfig.app.json` y el alias correspondiente en `vite.config.ts` (configuración del bundler para resolución de módulos). Cuando ejecutaste `npx shadcn@latest init`, falló porque shadcn/ui buscaba la configuración de aliases en el `tsconfig.json` coordinador (que está vacío por diseño en la nueva arquitectura) en lugar de en `tsconfig.app.json` (donde están las configuraciones reales), por lo que tuviste que crear manualmente `components.json` (archivo de configuración que le dice a shadcn/ui dónde instalar componentes como código fuente editable y cómo configurarlos con paths, estilos y aliases), instalar las dependencias `clsx` (utilidad para concatenar classNames condicionalmente), `tailwind-merge` (resuelve conflictos entre clases Tailwind) y `class-variance-authority` (sistema de variantes para componentes que shadcn/ui usa para combinar clases CSS de forma inteligente y crear APIs de componentes consistentes), crear las carpetas `src/lib` (utilidades compartidas) y `src/components/ui` (componentes de interfaz), y el archivo `src/lib/utils.ts` con la función `cn()` (utility function que combina clsx y tailwind-merge) que shadcn/ui usa para manejar clases CSS condicionalmente (resolver conflictos y combinar variantes). Todo este proceso demuestra cómo las herramientas modernas de frontend se integran en capas: Vite maneja el empaquetado y desarrollo (dev server + HMR + build optimization), TypeScript proporciona tipado con configuración modular (separación de concerns entre app y tooling), Tailwind CSS genera utilidades de estilo procesadas por PostCSS (atomic CSS approach con purging), y shadcn/ui ofrece componentes (copy-paste approach vs npm packages) que combinan todo esto con alias de importación para mantener el código limpio y mantenible (developer experience + maintainability).

## 2. Setting backend up

Has creado el proyecto backend desde cero usando `npm init -y` que genera un `package.json` básico con configuración CommonJS por defecto (a diferencia del frontend donde Vite proporcionaba scripts preconfigurados como `npm run dev`), luego instalaste Express como dependencia de producción (`npm install express`) que es el framework web asíncrono equivalente a Flask/FastAPI pero diseñado desde cero para Node.js basado en eventos. Como Express fue escrito en JavaScript puro antes de que existiera TypeScript, necesitaste instalar las definiciones de tipos por separado (`npm i @types/express @types/node -D`) que actúan como "documentación ejecutable" - paquetes independientes bajo el namespace `@types/` que contienen archivos `.d.ts` (type definitions) que le dicen a TypeScript qué métodos, propiedades y parámetros existen en librerías JavaScript, instalados como devDependencies porque solo se necesitan durante desarrollo/compilación, no en el bundle final de producción. Para ejecutar archivos TypeScript directamente sin compilación manual, configuraste un pipeline de desarrollo con `nodemon` (observador de archivos equivalente a `--reload` en Flask) ejecutando `ts-node` (compilador Just-In-Time que convierte TypeScript a JavaScript en memoria sin generar archivos .js), pero surgió un conflicto de sistemas de módulos porque Node.js intentaba usar ESM (ECMAScript Modules con `import/export`) mientras tu proyecto estaba configurado para CommonJS (`require/module.exports`), resuelto creando `tsconfig.json` con configuración específica que fuerza CommonJS en ts-node (`"module": "commonjs"`, `"ts-node": {"esm": false}`) y estableciendo las reglas de compilación (target ES2020, strict mode, interoperabilidad entre sistemas de módulos). Finalmente agregaste scripts personalizados en `package.json` (`"dev": "nodemon --watch . --ext ts --ignore node_modules --exec \"ts-node index.ts\" --legacy-watch"`, ya que los eventos nativos no funcionan al estar usando WSL2 en Windows)que actúan como aliases que aprovechan que npm añade automáticamente `node_modules/.bin` al PATH, permitiendo usar `npm run dev` en lugar del comando completo `npx nodemon --exec npx ts-node index.ts`, creando así un flujo de desarrollo profesional donde escribes TypeScript, nodemon detecta cambios, ts-node compila en memoria, y Node.js ejecuta el resultado - todo orquestado por un script simple que documenta claramente las operaciones disponibles para otros desarrolladores, contrastando con el frontend donde estas configuraciones venían preestablecidas por el template de Vite pero aquí requieren configuración manual porque Express es minimalista por diseño y cada proyecto backend tiene requisitos específicos diferentes.

**Arquitectura de Comunicación HTTP y Event Loop:**

Cuando tu frontend necesita comunicarse con el backend, utilizas `await fetch(url, options)` (fetch se está convirtiendo en el estándar) donde el segundo parámetro es un objeto de configuración que mapea directamente a los componentes de una petición HTTP: `method` especifica el verbo HTTP (GET por defecto para leer datos sin modificar nada, POST/PUT/DELETE para operaciones que cambian estado - diferencia semántica crucial porque GET debe ser idempotente y cacheable) equivalente a `curl -X POST`, `headers` define metadatos de la petición como `'Content-Type': 'application/json'` (equivalente a `curl -H 'Content-Type: application/json'`) que actúa como "contrato" entre frontend y backend especificando el formato de datos, y `body` contiene los datos reales pero DEBE ser string porque HTTP es protocolo de texto plano diseñado en los 90s (no objetos nativos de JavaScript que son construcciones de runtime), por eso usas `JSON.stringify(objeto)` para serializar tu objeto JavaScript a string JSON válido (equivalente a `curl -d '{"name":"Juan"}'`), proceso que invierte el parsing que hará el backend - esta conversión bidireccional objeto↔string es fundamental porque HTTP actúa como "túnel de texto" entre dos aplicaciones que pueden estar en lenguajes completamente diferentes.

**Middleware y Parsing de Datos:**

En Express, cuando ejecutas `app.listen(3000, callback)`, Express inmediatamente abre un socket TCP en el puerto 3000 (protocolo de transporte que gestiona conexiones de red a nivel del sistema operativo) y ejecuta el callback de confirmación sin bloquear el hilo principal, dejando el proceso "vivo" esperando eventos de red en el event loop asíncrono de Node.js (arquitectura fundamentalmente diferente a modelos síncronos donde el servidor se "bloquea" esperando requests), donde cada request HTTP que llega se convierte en un evento que desencadena la ejecución de handlers correspondientes pero el servidor nunca se "detiene" - simplemente registra listeners y confía en el event loop del runtime V8 para despachar eventos concurrentemente. El middleware `app.use(express.json())` DEBE ir ANTES de definir rutas porque actúa como "traductor universal" que intercepta requests con `Content-Type: application/json`, detecta el string JSON en el body crudo, lo parsea automáticamente a objeto JavaScript y lo coloca en `req.body` (sin este middleware crucial, `req.body` permanece undefined porque Express es minimalista por diseño y no asume formatos de datos), creando así el "puente" entre el string que viaja por HTTP y el objeto que manipulas en código - este middleware se ejecuta secuencialmente para cada request antes de llegar a rutas específicas, funcionando como "cadena de montaje" donde el orden importa crucialmente.

**Parámetros de URL y Organización de Datos:**

Las URLs pueden llevar parámetros dinámicos usando la sintaxis `:parametro` en la definición de ruta (`app.get('/users/:id/:action')`) donde Express automáticamente extrae valores de la URL real (`/users/123/edit`) usando pattern matching y los mapea a `req.params.id="123"` y `req.params.action="edit"` (siempre strings, nunca números automáticamente), accesibles elegantemente mediante destructuring `const { id, action } = req.params` (patrón ES6+ más limpio que acceso directo `req.params.id` y que permite renombrado `const { id: userId } = req.params`), mientras que Express organiza diferentes tipos de datos en espacios separados para evitar conflictos: `req.params` para parámetros de ruta extraídos de `/users/:id`, `req.query` para query strings parseados de `?page=1&limit=10`, `req.body` para datos JSON de POST/PUT procesados por middleware, y `req.headers` para metadatos HTTP como User-Agent y Authorization (esta separación evita que un parámetro `:id` colisione con un `?id=` en query string).

**Respuestas y Manejo de Datos:**

Para responder, Express ofrece métodos especializados con diferentes semánticas: `res.json(objeto)` para datos estructurados (automáticamente añade `Content-Type: application/json`, ejecuta `JSON.stringify` interno, y permite al frontend usar `response.json()` para parsing automático), `res.send(string)` para texto plano/HTML/números (más flexible pero menos semántico, Express intenta detectar el tipo automáticamente), usando template literals `` `Usuario ${name} creado con ID ${id}` `` para interpolación de variables que es más legible que concatenación tradicional con + y permite expresiones JavaScript complejas dentro de ${} incluyendo llamadas a funciones o operaciones ternarias. Los métodos HTTP tienen propósitos específicos que el frontend debe respetar: GET para obtener datos (sin body, cacheable, idempotente), POST para crear recursos (con body, no idempotente), PUT para actualizar completo (con body, idempotente), PATCH para actualizar parcial, DELETE para eliminar (idempotente) - esta semántica HTTP permite a proxies, caches y navegadores optimizar automáticamente el comportamiento de red.

**Edge Cases y Buenas Prácticas:**

Edge cases que causarán frustración inevitable: olvidar `express.json()` resulta en `req.body` perpetuamente undefined sin error obvio (el request llega pero el body permanece como stream sin procesar), olvidar `JSON.stringify()` en fetch envía literalmente la string "[object Object]" porque JavaScript convierte automáticamente objetos a string con .toString(), usar GET con body se ignora silenciosamente por estándar HTTP porque GET debe ser idempotente y cacheable, destructuring de `req.params` undefined explota la aplicación sin manejo de errores (`const { id } = undefined` lanza TypeError), no validar tipos de parámetros puede causar crashes sutiles (`:id` siempre es string, usar `parseInt(id)` para números), y el orden de middleware importa crucialmente porque se ejecutan secuencialmente (parsers antes de rutas, autenticación antes de autorización, manejo de errores al final). Las prácticas modernas incluyen destructuring sistemático para extraer propiedades (`const { name, email } = req.body` permite detectar propiedades faltantes fácilmente vs acceso directo que puede fallar silenciosamente), async/await con manejo explícito de errores try/catch (especialmente para operaciones de base de datos), validación de entrada ANTES de lógica de negocio usando librerías como joi o zod, códigos HTTP semánticamente correctos (200 OK para éxito sin crear recursos, 201 Created para recursos nuevos con Location header, 400 Bad Request para errores de validación del cliente, 404 Not Found para recursos inexistentes, 500 Internal Server Error para fallos inesperados del servidor), estructura de respuestas API consistente tipo `{ success: boolean, data: any, message: string, timestamp: new Date().toISOString() }` que permite al frontend manejar respuestas uniformemente independientemente del endpoint específico, y separación clara entre routes (definición de endpoints y validación básica), controllers (lógica de negocio y transformación de datos), services (operaciones de base de datos y APIs externas), y middlewares (funcionalidad transversal como autenticación, logging, rate limiting), creando arquitectura escalable donde cada componente tiene responsabilidad única y bien definida, facilitando testing unitario y mantenimiento a largo plazo.

**CORS Setup y Edge Cases**

Instalas `npm i cors @types/cors` porque necesitas permitir que tu frontend (puerto 3000) acceda a tu backend (puerto 3000) - sin esto el navegador bloquea las peticiones cross-origin por seguridad. El `app.use(cors())` debe ir ANTES de tus rutas (orden de middleware crucial) y básicamente añade headers como `Access-Control-Allow-Origin: *` que le dicen al browser "está bien, acepta estas peticiones".

## 3. A bit of React

React tiene componentes que usan useState para manejar estado local con el patrón `const [data, setData] = useState(valor)` donde siempre obtienes `[valorActual, funcionParaCambiarlo]` (similar a como Python retorna tuplas), y si usas asignación directa en lugar de la función setter, React no detecta el cambio y no re-renderiza (porque React compara por identidad de objeto, no por valor). useEffect maneja efectos secundarios como API calls o suscripciones (no decide qué renderizar, eso lo hace el JSX que retornas), donde `useEffect(() => {}, [])` con array vacío se ejecuta una vez al montar como `__init__` en Python (útil para fetch inicial de datos), sin array se ejecuta en cada render (peligroso, puede crear loops infinitos), y con `[variable]` se ejecuta cuando esa variable cambia (como un watcher reactivo). No puedes hacer useEffect async directamente porque espera retornar una función de cleanup o undefined, no una Promise (las funciones async siempre retornan Promise), entonces defines una función async dentro y la llamas inmediatamente `useEffect(() => { const fetchData = async () => { await api(); }; fetchData(); }, [])` (patrón común en React, no es técnicamente IIFE). Los early returns como `if (loading) return <div>Loading...</div>` evalúan estados problemáticos antes del render principal (evita renderizar JSX innecesario y mejora legibilidad), y cada `setLoading(true)` dispara un re-render completo ejecutando toda la función del componente con los nuevos valores de estado (React usa reconciliación para optimizar qué DOM actualizar realmente). useCallback memoriza funciones para que mantengan la misma referencia entre renders (React compara por referencia de objeto, no por contenido), útil para optimizar cuando pasas funciones como props a componentes hijos porque evita re-renders innecesarios de esos hijos cuando las dependencias no han cambiado. We will work with all this later.

## 4. Setting the Node

Primero generamos una cuenta Ethereum con: `docker run -v ./data:/data -v ./pwd.txt:/p.txt ethereum/client-go:v1.13.15 account new --datadir /data --password /p.txt` tras crear un `pwd.txt` con una contraseña (por ejemplo “123456”). Esto produce una dirección pública aleatoria junto con su clave privada, cifrada y almacenada en `./data/keystore`. Aquí aún no existe ninguna blockchain: la cuenta se basa solo en operaciones criptográficas locales (clave privada → dirección pública), y la probabilidad de colisión es tan baja que se considera irrelevante. Además, la dirección generada es totalmente agnóstica de la red: no "pertenece" a ninguna testnet o mainnet —vive en otro plano matemático— y puede usarse en cualquier red si se importa su clave privada; si la incluimos en el genesis de una red local, puede tener saldo inicial incluso si jamás ha sido usada o conocida por ningún nodo. A continuación, creamos un archivo `genesis.json` para definir los parámetros de nuestra red privada: usamos Proof of Authority (PoA) por ser más práctico para entornos de desarrollo (bloques rápidos, sin pruebas de trabajo), y configuramos `chainId`, `gasLimit`, `period`, `epoch`, etc. En `extraData` insertamos: 32 bytes de padding (ceros), la dirección del validador, y 65 bytes para una firma (en el bloque génesis no se valida, pero es obligatorio en estructura). También incluimos en `alloc` cualquier dirección que queramos que tenga saldo inicial —la cuenta generada por Geth, y por ejemplo una generada en MetaMask. No importa si esa address nunca ha sido “creada” en el nodo o no tiene clave privada accesible: las direcciones existen por definición matemática, no necesitan ser registradas ni descubiertas. El nodo ni las “conoce” ni las “crea”: simplemente están. Luego inicializamos la blockchain con: `docker run -v ./genesis.json:/genesis.json -v ./data:/data ethereum/client-go:v1.13.15 init --datadir /data /genesis.json`. Esto genera la estructura del estado en disco (`chaindata`, `ancient`, etc.), persistente en `./data`, y es crucial entender que aunque el contenedor sea efímero (si usamos `--rm`), la cadena no se pierde porque su estado está en el volumen montado. Para arrancar el nodo y activar la red ejecutamos: `docker run --rm -v ./datos:/data -v ./pwd.txt:/p.txt -p 5556:8545 ethereum/client-go:v1.13.15 --datadir /data --unlock "0x52f23bf558697b1d4f480e1aa27d7852709b1cc0" --password /p.txt --allow-insecure-unlock --mine --miner.etherbase "0x52f23bf558697b1d4f480e1aa27d7852709b1cc0" --nodiscover --http --http.addr "0.0.0.0" --http.port 8545 --http.api "admin,eth,net,web3" --http.corsdomain "*" --ipcdisable`. Esto lanza el nodo, activa la minería PoA (basta con ser validador, no se resuelven puzzles), y expone la API JSON-RPC en localhost:5556 para que herramientas como MetaMask o `curl` puedan interactuar (`geth` acepta comandos como `curl -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber",...}' http://localhost:5556`). `--ipcdisable` evita conflictos en WSL2, `--nodiscover` desactiva el descubrimiento de pares (útil en desarrollo aislado), y `--allow-insecure-unlock` permite desbloquear la cuenta sin IPC, algo inseguro en producción pero práctico en local. La blockchain ahora “vive”: se generan bloques automáticamente, y cualquier address con clave privada puede conectarse e interactuar (ej. vía MetaMask). Si una cuenta fue incluida en `alloc`, verá saldo inicial; si no, simplemente comienza con 0. No es que “no exista”: simplemente aún no ha hecho nada visible en la red. Podemos añadir esta red a MetaMask manualmente con el mismo `chainId` y la RPC URL `http://localhost:5556`, y cualquier cuenta con clave importada podrá firmar y enviar transacciones. En resumen: las cuentas son independientes de la red (no hay registro central), su existencia es matemática y pueden aparecer en cualquier blockchain si se las referencia (ej. en `alloc`); el estado de la blockchain (número de bloque, saldos, historial) se guarda en `./data` y persiste aunque borres el contenedor; el contenedor es efímero, pero la red vive en tu disco; la API RPC está disponible vía HTTP para herramientas como MetaMask o `curl`; y la configuración PoA permite simular entornos realistas de Ethereum en local, con control total sobre la minería, validadores, saldos y nodos, sin depender de terceros ni internet.

## 5. Rutas del servidor

Vamos a hacer POST api/faucet/:address/:amount y devolvera {address:   amount:    fecha} luego un GET /api/balance/:address    y deovlera {address    balance    fecha     }   y luego un GET /api/isAlive    devuvle {alive: true}
No ncesitaremos rutas trasnfer ya que estas se realzian entre front y metamask
podreemos probarlas via curl http://localhost:3000/isAlive
curl http://localhost:3000/balance/0xxxxxxxx
curl -X POST http//localhost:3000/0x333/0.1
no necesitamos uan funcion en backend que haga el transfer porque reuqire signing y eso son datos sensibles que mejor debe maneajr metamask ineteracutnado diemrcatne con el frontend de react
he creado un app.get api/balance/:address en backend que hace un fetch al nodo 5556 guarnado el resulado en resposne y leug olo devuevle, y probaba curl pero no me dejaba. he visto luego con lsof -i :3333 que era un puerto cogido por node.js... asi que el curl se uedaba colgado. he cambiado a port 3000 y ya tira(tambien he actualizado este README para que conste 3000 en todo, simepemten recuerda estam orealej de los peurtos).
entonces el obtener balancelo hacemos lanzano un post a eth_getBalance en nuestro endpoint de api/balance/:address ... y lo deovlvemos como res.json(...)
Como curiosidad hay una liberari llamada ethers que entre otras csas tambien permite hacerlo asi :  const { address } = req.params;
    const provider = new ethers.JsonRpcProvider("http://localhost:5556");
    const balance = await provider.getBalance(address);
res.json({
        address address,
        balance: balance.toString(),   becaaaaaaaaaaaaause return a BigInt and JSON cannot serialize values BiINT directly
        date: ...
a continuacion 

ether nos permite leer el archivo keystore de la address que nos hemos creado y puesto como nodo validador en el genesis, cuya contraseña tenemos guardada en local
es decir : recogemos los parametros de la peticion, creamos un provider (nuestro nodo 5556) especificmaos la ruta del keystore, extraemos la ruta y con esa ruta nos creamos una waller usando ethers.Waller.fromEncryptedJson(rutaData, "123456" password), y la conectamos al provider (waller.connect(provider)) nuestro nodo (localhost:5556) y luego hacemos await walletConnected.sendTransaction(to: address, value: ethers.parseEther(amount)) y al final await tx.wait(). Por todo esto, este app.get debe ser async. Luego el curl lo haremos pasndo a nuestro backend (localhost:3000) al url api/faucet/<address>/amount, siendo address el de metamkas que habiamso reistrado en genesis para asi poder ver a traves de metamask como se actualiza su valor (ethers basicamente nos sirve para crear un objeto wallet con el keystore content y nuestra password)

## 6. Volviendo al front

Vamos a empezar desde cero. Creamos un template de front desde el directorio raíz mediante npm create vite@latest front -- --template react-ts, volvemso a hacer npm install, ponemos tailwindcss, postcss, autoprefixer  y npm install -D tailwindcss con luego un npx tailwindcss init -p crear los tailwind.config.js y postcss.config.js. Susitutimos contenido en tailidnc.cofnig.js and in index.css con las directivas. Y simplificmaos app.tsx. actualziamos tscofnig.json para shadcn  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
y npm i -D @types/node
y esto al vite.config.ts : resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
y para que vite recargue (evtiar problemas que da WSL2) ponemos en el vite.cofnig.ts server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
    host: true, // This allows access from outside the container/WSL
    port: 5173,
npx shadcn@latest init, which creates front/src/lib/utils.ts.
utils.ts lets us add components sin tener que especificra el directorio completo
tambien modifica index.css, lo llena de 
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem
  }
  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
ahora vamos a instalar un boton
npx shadcn@latest add button y lo guarda en src/components/ui/button.tsx

## 7. React

Lo omcpcaido esm epzarp or algun sitio. lo mejro es emepzar pro un router, que enlaza links con diferentes componentes.
npm i react-router-dom

al router provider le pasamos el router, conlo cual va a ser cosncinete de todas las ruta
al accceder al a pliaccion lo primero que se presenta es el dashboard

export function Home() {
  return <div>Home</div>;
}

export function Faucet() {
  return <div>Faucet</div>;
}

export function Balance() {
  return <div>Balance</div>;
}

export function Transfer() {
  return <div>Transfer</div>;
}

export function Header() {
  return <div>Header</div>;
}

export function Dashboard() {
  return (
    <div className='container'>
      <Header />
      <h1 className="text-xl">Dashboard</h1>
      <Outlet />
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />,
    children: [
      {path: "home", element: <Home />},
      {path: "faucet", element: <Faucet />},
      {path: "balance", element: <Balance />},
      {path: "transfer", element: <Transfer />}
    ]
  }
]);

export default function App() {
  return (
    <div>
      <RouterProvider router={router} />
    </div>
  )
}

http://localhost:5173

devuelve una pantalla donde se ve Header y Dashboard
pero si ponemos http://localhost:5173/faucet, muestra Headaer y sahbodrd y debajo Faucet

la idea es ir conviritnedo los componentes a ficheros

osea basicamente hemos creado un router con react-router-dom donde metemos el arbol de posibles endpoints, path, element, children. El element debe ser una "export function" defindia mas arriba. Si esta en el path "/", sera el punto de entrada. Y en este dashboard dentro de su definicion podemos ponerle otro componente (header) que contenga los links (no cosnta en el routing, es simplemente un componente que contendra los links). Y muy remarcable, el <Outlet /> tag lo que hace es poner el children en el que nos encontramos de la URL, es decir si estamos en Dashboard y tiene un children, al entrar a dashbaord ("/") /ese_children pues <Outlet/> va a ser ese componente children.

Los componentes los podemos aislar en front/src/components/ui y los vamos colocando alli. Esto siginfica que nceistarmeos mucho import, pero está bien. No nso precoemos por los improts, son enceairos para leugo tener los compoentesn separados y claros, mejor que ir navegnado arriba ya abjo en un mismo archivo

ahroa queremos un estado global porque queremos traer la cuenta de metamask al compoentne header y esa cuenta la van atener que usar otros componentes. antes era muy complejo en react. tenemos que meter en esta aplciacion ese estado global con la finromacion minima que deben compartir todos los componentes.

luego añadiendo export default function App() {
  const [user, setState] = useState({
    acc: "xxxxxxxx"
  }); // contexto para todos los scopes derivados
  return (
    <UserContext.Provider value={{user, setState}}>   /// vemos que suele ser el mas externo del return raiz en app

      <div>
        <RouterProvider router={router} /> {/* se entera de las rutas y sus contenidos */}
      </div>
      
    </UserContext.Provider>
  )
}en la app.tsx el useState, lo que tiene, osea, en chapters anteriores vimos que useState servia para definiru n condicional y React se enterara de sucambio, pero eske ademas es global. podemos deifnir un objeot con llaves y luego acceder a él porque estamso deinfeidno usercontect provider con value y luego en elementos en casdcada podremos acceder a él usando const { user } = useContext(UserContext); y lo especial de esto es que se va acambiar en todos los elementos en que aparece, a la vez. por eso es de contexto global.
ten presnte que puede haber compoentnes que no necsiaramente esten en el router, y que el outlet es la forma de meter elements dentro de otros en el front cuando se va al path, si no entro al path, el outlet no se muestra. esta alli, uciado en el cofigo fuente de un componente, hsta que ponemos la URL acorde entonces se muestra.
aqui usaremos useeffect para que ocurra algo. apra conectar a metamask.
sacamos el inycetado etehreum del window (window as any) .ethereum y le hacemos un API JSON RPC request lueg oparseamos la repuesta para setState acc: acc[0] pero claor y si leug ovolvemos a cmabiar, cambiar ¿? no, porque use Effects olo cambia al empezar, o cuando cambia uan variable... y en este caso lo que quermeos es que lacamibar desdem ektamask, nuestra app esuche y cambie tamiben la var state = {acc} asi que usamos un ehterum.on("accountsChanged", ... set astate acc : acc[0]), un lsitswener. asi aqui se registra unav ez y leugo estar eucahndo siemrpe.

























