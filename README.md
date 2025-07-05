> **⚠️ DISCLAIMER**: These are just some rough notes I put together while working on this project. I wrote them as I went, so things might be a bit scattered or unfinished in parts (especially toward the end). I realized that after pushing it, but decided to leave it in as-is — it reflects the actual flow of how I approached and figured things out. It's also handy to have a quick reference to glance back at when needed.

# Summary

We want to build a service that allows users to connect via MetaMask, receive limited test funds (e.g. 0.1 ETH), check their balances, and transfer funds between accounts using MetaMask. The UI will include `/faucet`, `/balance`, and `/transfer` routes, along with a green or red status icon depending on the Ethereum node’s availability.

Testing covers getting balances, sending funds, and transferring via MetaMask. The architecture includes a React app in TypeScript using Tailwind and ShadCN, a Node.js + Express backend (also in TypeScript), and an Ethereum node running in Docker with Proof of Authority consensus.

The project starts with `npm create vite@latest`. Tailwind is configured, ShadCN is installed via its website, and the backend is created with the following routes:

* `POST /api/faucet/:address/:amount`
* `GET /api/balance/:address`
* `GET /api/isAlive`

Transfers are handled from the frontend via MetaMask. Backend endpoints are tested with `curl` or Postman.

# Steps

## 1. Setting frontend up

I created a React project with Vite using TypeScript, then installed Tailwind CSS v3. Tailwind requires PostCSS as the CSS transformation engine and Autoprefixer for cross-browser compatibility—both as dev dependencies to process and optimize my styles.

I ran `npx tailwindcss init -p`, which generated two config files:

* `tailwind.config.js` — where I define which files Tailwind should scan for class names (also used for purge/optimization).
* `postcss.config.js` — tells Vite how to run Tailwind in the build pipeline.

At first, Tailwind styles weren’t applying because the `content` field in `tailwind.config.js` didn’t include the correct file paths. It needed `"./src/**/*.{js,ts,jsx,tsx}"` so Tailwind could find class names like `text-3xl` and generate only the styles actually used (for optimal bundle size).

Next, I wanted to add **shadcn/ui**, which provides pre-built components (copy-pasteable React source code, not an npm library). These components use Tailwind internally and come with styling, behavior, accessibility, and design variants out of the box. However, shadcn/ui expects import aliases like `@/components` (instead of long relative paths like `../../../components`) to work properly.

Modern Vite setups with TypeScript use a modular architecture (Project References). That means my root `tsconfig.json` acts as an orchestrator and delegates to more specific configs like:

* `tsconfig.app.json` — for my React app (includes lint rules and alias paths).
* `tsconfig.node.json` — for build tools like Vite (with different target settings).

So, I added `baseUrl: "."` and alias mappings like `paths: { "@/*": ["./src/*"] }` to `tsconfig.app.json`, and updated `vite.config.ts` to match (so Vite resolves aliases correctly).

Then, running `npx shadcn@latest init` failed — because shadcn/ui looks for aliases in the root `tsconfig.json`, which (by design) is mostly empty in this architecture. To fix this, I manually created a `components.json` config file to tell shadcn/ui where to install components, how to configure paths/styles, and which aliases to use.

I also installed the required dependencies:

* `clsx` — for conditionally joining class names.
* `tailwind-merge` — to resolve conflicting Tailwind classes.
* `class-variance-authority` — used by shadcn/ui to manage component variants and class logic.

I created the `src/lib` folder (for shared utilities) and `src/components/ui` (for UI components), and added a `src/lib/utils.ts` file with the `cn()` function — a helper that combines `clsx` and `tailwind-merge`, used by shadcn/ui to handle conditional class names and resolve class conflicts.

All of this showcases how modern frontend tooling fits together in layers:

* **Vite** handles bundling, dev server, HMR, and optimized builds.
* **TypeScript** offers type safety and modular config separation between app and tooling.
* **Tailwind CSS** provides atomic styling processed via PostCSS, with tree-shaking for unused classes.
* **shadcn/ui** adds composable components built with Tailwind and powered by import aliases for cleaner, maintainable code.

Together, they form a stack that balances developer experience with long-term maintainability.

## 2. Setting backend up

I set up the backend project from scratch using `npm init -y`, which generates a basic `package.json` with CommonJS configuration by default (unlike the frontend, where Vite comes with preconfigured scripts like `npm run dev`).

Then I installed Express as a production dependency (`npm install express`). Express is an asynchronous web framework, similar to Flask or FastAPI, but built from the ground up for Node.js’s event-driven architecture.

Since Express was originally written in plain JavaScript (before TypeScript was widespread), I had to install its type definitions separately with `npm i @types/express @types/node -D`. These `@types/*` packages are essentially executable documentation — standalone `.d.ts` files that tell TypeScript what functions, properties, and parameters exist in JavaScript libraries. I installed them as devDependencies since they’re only needed during development and not in the final production bundle.

To run TypeScript files directly without compiling them manually, I set up a dev pipeline using `nodemon` (a file watcher, similar to Flask's `--reload`) to execute `ts-node` (a JIT compiler that runs TypeScript by converting it to JavaScript in memory).

Initially, I hit a module system conflict: Node.js was trying to use ESM (`import/export`), while my project was set up for CommonJS (`require/module.exports`). I resolved that by configuring `tsconfig.json` to explicitly enforce CommonJS for `ts-node`, setting `"module": "commonjs"` and `"ts-node": { "esm": false }`, along with other compile settings like `target: "ES2020"`, `strict: true`, and interop flags for smoother module resolution.

Then I added a custom script in `package.json`:

```json
"scripts": {
  "dev": "nodemon --watch . --ext ts --ignore node_modules --exec \"ts-node index.ts\" --legacy-watch"
}
```

I used `--legacy-watch` because I’m working in WSL2 on Windows, where native file system events don’t work reliably. This setup lets me run `npm run dev`, which is cleaner than typing out the full command with `npx`. It works because npm automatically includes `node_modules/.bin` in the PATH.

Now I have a professional dev workflow: I write in TypeScript, `nodemon` watches for changes, `ts-node` compiles on the fly, and Node.js runs the result — all wired together through a simple `npm` script that also documents the process for other developers.

Compared to the frontend (where Vite handles most of this out of the box), setting up Express required more manual config — but that’s by design. Express is intentionally minimal, so backend setups are more tailored to the specific needs of each project.

### HTTP Communication Architecture and Event Loop

When my frontend needs to communicate with the backend, I use `await fetch(url, options)`. `fetch` is quickly becoming the standard for making HTTP requests in modern JavaScript.

The second parameter, `options`, is a config object that maps directly to components of an HTTP request:

* `method` specifies the HTTP verb. It's `GET` by default (used for reading data without modifying anything). Other verbs like `POST`, `PUT`, or `DELETE` are used for state-changing operations. This distinction is important: `GET` should be idempotent and cacheable, whereas `POST` and `PUT` are not. It’s essentially the same as using `curl -X POST`.

* `headers` define metadata for the request. A common example is `'Content-Type': 'application/json'`, which acts as a kind of "contract" between frontend and backend — it tells the server what format to expect. This is equivalent to `curl -H 'Content-Type: application/json'`.

* `body` contains the actual data being sent — but it **must** be a string. HTTP is a plain-text protocol from the 1990s, so it doesn’t understand native JavaScript objects. That’s why I use `JSON.stringify(obj)` to serialize JavaScript objects into valid JSON strings. This is equivalent to `curl -d '{"name":"Juan"}'`.

On the backend, this string will later be parsed back into an object — effectively reversing the serialization process. That object-to-string-to-object conversion is fundamental when communicating over HTTP, since it's just a text-based "tunnel" between two potentially unrelated applications (they could even be written in different languages).

### Middleware and Data Parsing


In Express, when I call `app.listen(3000, callback)`, Express immediately opens a TCP socket on port 3000. TCP is the transport-layer protocol responsible for handling network connections at the OS level.

The `listen` call triggers the callback without blocking the main thread — instead, it leaves the process "alive," sitting in Node.js’s asynchronous event loop. This is fundamentally different from synchronous server models where the server might block while waiting for requests.

In Node.js, every incoming HTTP request is treated as an event. The server doesn’t stop or wait — it simply registers handlers (listeners) for those events and relies on the V8 engine's event loop to dispatch them concurrently.

Now, regarding middleware: I always place `app.use(express.json())` **before** defining any routes. This middleware acts like a "universal translator" — it intercepts any request with the `Content-Type: application/json`, extracts the raw JSON string from the body, parses it into a JavaScript object, and assigns it to `req.body`.

Without this middleware, `req.body` would be `undefined`, because Express is intentionally minimal and doesn’t assume any particular data format by default. This middleware creates the bridge between the plain text that travels over HTTP and the JavaScript object I work with in code.

Middleware in Express is executed in order, for **every** request. It works like a processing pipeline — a kind of "assembly line" — so the order matters a lot. If `express.json()` comes after route definitions, it simply won’t run in time to process the body, and my routes won’t receive the parsed data.

### URL Parameters and Data Organization

In Express, I can define dynamic URL parameters using the `:param` syntax in route definitions — for example, `app.get('/users/:id/:action')`. Express automatically performs pattern matching against the incoming URL (e.g. `/users/123/edit`) and maps the matched segments to `req.params`. In that case, `req.params.id === "123"` and `req.params.action === "edit"`.

It's important to note that these values are **always strings**, even if they look like numbers. If I need them as actual numbers, I have to convert them manually.

I usually access these parameters using ES6+ destructuring, which makes the code cleaner:

```ts
const { id, action } = req.params;
```

If I need to rename a param for clarity or consistency, destructuring also supports that:

```ts
const { id: userId } = req.params;
```

Express keeps different types of incoming data in separate namespaces to avoid conflicts:

* `req.params` holds route parameters (e.g. `/users/:id`)
* `req.query` contains parsed query strings (e.g. `?page=1&limit=10`)
* `req.body` contains parsed JSON from the request body (e.g. from a POST or PUT), which is made available via middleware like `express.json()`
* `req.headers` holds HTTP metadata like `User-Agent`, `Authorization`, etc.

This clear separation ensures that a route param like `:id` won’t conflict with a query param `?id=...` or a property in the request body. Each source of input data is isolated, which helps keep routing logic clean, predictable, and maintainable.

### Responses and Data Handling

In Express, I use different response methods depending on the type of data I want to return, each with its own semantics:

* `res.json(object)` is my go-to for structured data. It automatically sets the `Content-Type` header to `application/json`, internally runs `JSON.stringify()`, and makes it easy for the frontend to parse the response using `response.json()`.

* `res.send(string)` is more flexible — I use it for plain text, HTML, or even numbers. Express tries to infer the correct content type automatically, but it’s less semantically strict than `res.json()`.

When building response messages, I prefer template literals like:

```js
res.send(`User ${name} created with ID ${id}`);
```

Template literals are more readable than traditional string concatenation with `+`, and they allow me to include complex expressions directly inside `${}` — including function calls, ternary expressions, or logic.

On the frontend side, it's important to respect the semantics of HTTP methods:

* `GET`: for retrieving data (no body, cacheable, and idempotent — making it safe for repeated use)
* `POST`: for creating resources (has a body, not idempotent — each call usually creates something new)
* `PUT`: for fully updating an existing resource (has a body, and **is** idempotent — repeating the request yields the same result)
* `PATCH`: for partial updates
* `DELETE`: for removing resources (also idempotent)

Following these HTTP conventions isn’t just good practice — it allows intermediaries like proxies, caches, and browsers to optimize behavior automatically. It makes both the client and server more predictable and interoperable across the web.

### Edge Cases and Best Practices

### Edge Cases That Will Inevitably Cause Frustration

There are a number of common pitfalls in Express that can lead to hours of confusion if you’re not careful. These are the ones I’ve personally hit — and now avoid religiously:

* **Forgetting `express.json()`**: If I don’t register this middleware before my routes, `req.body` will always be `undefined`. No error is thrown, the request "works," but the body remains an unparsed raw stream. Easy to miss, hard to debug.

* **Forgetting `JSON.stringify()` in `fetch()`**: If I send a plain object as the body, JavaScript will convert it to the string `"[object Object]"`, because of how `.toString()` works on objects. Always stringify before sending.

* **Using `GET` with a body**: This is silently ignored. By HTTP standards, GET requests must be cacheable and idempotent, and they’re not supposed to include a body. Most servers and browsers just drop it.

* **Destructuring `req.params` when it's undefined**: If I destructure from something that’s `undefined` — like `const { id } = req.params`, when the route doesn’t match — the app crashes with a `TypeError`. Always make sure the object exists or use optional chaining/default values.

* **Not validating parameter types**: Route parameters like `:id` are always strings, even if they look numeric. Using them as numbers without conversion (e.g. `parseInt(id)`) can cause subtle bugs or crashes later in logic.

* **Incorrect middleware order**: Middleware is executed sequentially, so order is critical:

  * Parsers (e.g. `express.json()`) must come before routes
  * Auth middleware should come before access control or business logic
  * Error-handling middleware must come last

---

### Modern Best Practices I Follow

* **Consistent destructuring**: I always destructure `req.body`, `req.params`, and `req.query`:

  ```ts
  const { name, email } = req.body;
  ```

  This makes it easy to see what's expected and spot missing fields. It’s far better than deep `req.body.email` checks that silently fail.

* **Async/await with proper error handling**: Especially for database calls or any async logic, I always wrap my controllers in `try/catch` blocks to prevent unhandled rejections and make errors explicit.

* **Input validation upfront**: Before doing anything with the data, I validate it using libraries like `zod` or `joi`. This keeps my logic safe and prevents unexpected bugs later in the flow.

* **Correct HTTP status codes**: I return codes based on the actual outcome:

  * `200 OK` — successful GET/PUT/PATCH with no resource creation
  * `201 Created` — when a new resource is created (with optional `Location` header)
  * `400 Bad Request` — for client validation errors
  * `404 Not Found` — when a resource is missing
  * `500 Internal Server Error` — for unhandled or unexpected server issues

* **Consistent API response shape**: Every endpoint returns the same response structure:

  ```ts
  {
    success: boolean,
    data: any,
    message: string,
    timestamp: new Date().toISOString()
  }
  ```

  This consistency helps the frontend handle responses predictably, regardless of the specific endpoint.

* **Clear separation of concerns**: I follow a layered architecture:

  * **Routes**: define the endpoint and attach basic validation
  * **Controllers**: contain business logic and data formatting
  * **Services**: perform DB queries or external API calls
  * **Middlewares**: handle cross-cutting concerns like auth, logging, or rate limiting

Each layer has a single, well-defined responsibility. This makes the project easier to test, scale, and maintain over time — and helps avoid the "everything in one file" anti-pattern that quickly becomes unmanageable.

### CORS Setup and Edge Cases

You install `npm i cors @types/cors` because your frontend (usually running on port 3000) needs to access your backend (often on a different port, like 3001), and without enabling CORS, the browser will block these cross-origin requests for security reasons. The middleware `app.use(cors())` must be placed **before** your route definitions — middleware order matters — because it needs to intercept and modify the response headers early in the request lifecycle. What it effectively does is add headers like `Access-Control-Allow-Origin: *`, which tells the browser: "this server allows requests from any origin." This is necessary for local development, where frontend and backend are running on different ports or hosts, even though they’re on the same machine. Without it, fetch requests from your frontend will silently fail due to CORS policy enforced by the browser, not by Express itself.

## 3. A bit of React

React components use `useState` to manage local state. The pattern is:

```js
const [data, setData] = useState(initialValue);
```

This always gives you a tuple: the current value and a setter function — similar to Python’s tuple unpacking.

If you try to update the value by assigning directly to `data`, React won't detect the change, and the component won't re-render. That's because React checks for changes by **object identity**, not by value.

---

For side effects (like API calls, timers, subscriptions), React uses `useEffect`.

Example:

```js
useEffect(() => {
  // side effect here
}, []);
```

* With an **empty array**, it runs once when the component mounts — similar to `__init__` in Python.
* If you **omit the array**, it runs on **every render** — which can create infinite loops if not handled properly.
* If you provide a **dependency array** like `[value]`, the effect will run whenever that value changes.

---

You can't make `useEffect` itself `async` — it must return either a cleanup function or `undefined`, not a Promise. Since `async` functions always return a Promise, the common pattern is:

```js
useEffect(() => {
  const fetchData = async () => {
    await apiCall();
  };

  fetchData();
}, []);
```

This is a common idiom in React — not technically an IIFE, but functionally similar.

---

To handle loading states or early exit conditions, use **early returns** in the render logic:

```js
if (loading) return <div>Loading...</div>;
```

This helps avoid rendering unnecessary JSX and makes the logic easier to follow.

Every time you call `setLoading(true)` or any other state setter, React triggers a **re-render**. The entire function runs again with the new state, and React uses its reconciliation algorithm to figure out what actually needs to be updated in the DOM.

---

`useCallback` is a hook that **memoizes functions**. This keeps the same function reference between renders unless its dependencies change:

```js
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]);
```

This is useful when passing functions as props to child components. If the reference stays the same, the child component won’t unnecessarily re-render — which is good for performance.

## 4. Setting the Node

We start by generating an Ethereum account using the following command:

```bash
docker run -v ./data:/data -v ./pwd.txt:/p.txt ethereum/client-go:v1.13.15 account new --datadir /data --password /p.txt
```

This requires a `pwd.txt` file containing a password (e.g. `"123456"`). The result is a randomly generated public address along with its private key, encrypted and stored in `./data/keystore`.

At this point, no blockchain exists yet — the account is created purely through local cryptographic operations (private key → public address). The probability of address collision is so low that it's considered negligible. Importantly, the address is completely **network-agnostic** — it doesn’t "belong" to any testnet or mainnet. It exists on a purely mathematical level and can be used on any network simply by importing its private key. If we include it in the genesis file of a local network, it can start with a balance — even if it’s never been used or known by any node.

Next, we define our own private network by creating a `genesis.json` file. We use **Proof of Authority (PoA)**, which is more practical for development environments (fast blocks, no PoW mining required). In this file, we configure parameters such as `chainId`, `gasLimit`, `period`, `epoch`, and so on. The `extraData` field includes 32 bytes of padding (zeros), the validator address, and 65 bytes for a signature — the signature isn’t verified in the genesis block, but its presence is required structurally.

We also populate the `alloc` field with any addresses we want to pre-fund — including the Geth-generated address and, optionally, one generated in MetaMask. Whether or not the address was ever "created" or its private key is known to the node doesn’t matter: addresses in Ethereum exist by mathematical definition. The node doesn't "create" or "discover" them — they simply exist.

To initialize the blockchain, we run:

```bash
docker run -v ./genesis.json:/genesis.json -v ./data:/data ethereum/client-go:v1.13.15 init --datadir /data /genesis.json
```

This sets up the on-disk state structure (`chaindata`, `ancient`, etc.) in `./data`. Even if the container is removed (with `--rm`), the blockchain state persists because it lives in the mounted volume.

We then start the node with:

```bash
docker run --rm -v ./data:/data -v ./pwd.txt:/p.txt -p 5556:8545 ethereum/client-go:v1.13.15 \
  --datadir /data \
  --unlock "0x52f23bf558697b1d4f480e1aa27d7852709b1cc0" \
  --password /p.txt \
  --allow-insecure-unlock \
  --mine \
  --miner.etherbase "0x52f23bf558697b1d4f480e1aa27d7852709b1cc0" \
  --nodiscover \
  --http \
  --http.addr "0.0.0.0" \
  --http.port 8545 \
  --http.api "admin,eth,net,web3" \
  --http.corsdomain "*" \
  --ipcdisable
```

This starts the node, enables PoA mining (just by being a validator — no puzzles to solve), and exposes the JSON-RPC API on `localhost:5556`, making it accessible to tools like MetaMask or `curl`.

* `--ipcdisable` avoids IPC conflicts in environments like WSL2.
* `--nodiscover` disables peer discovery — useful for isolated development.
* `--allow-insecure-unlock` enables account unlocking over HTTP, which is insecure in production but acceptable for local use.

At this point, the blockchain is **alive** — blocks are mined automatically, and any account with a private key can connect and interact (e.g., via MetaMask). If an account was included in `alloc`, it will show a balance; otherwise, it simply starts at zero. It’s not that the address doesn’t "exist" — it just hasn’t done anything yet on the chain.

You can manually add this local network to MetaMask using the same `chainId` and the RPC URL `http://localhost:5556`. Any account with an imported private key can sign and send transactions.

### In Summary:

* **Accounts are network-independent** — they exist by mathematical definition and can appear in any blockchain if referenced (e.g. in `alloc`).
* **Blockchain state** (blocks, balances, transaction history) is stored in `./data` and persists across container restarts or deletions.
* **The container is ephemeral**, but the blockchain lives on your disk.
* **The RPC API** is accessible via HTTP and compatible with tools like MetaMask or `curl`.
* **PoA configuration** makes it easy to simulate realistic Ethereum environments locally, giving full control over mining, validators, balances, and network behavior — all without relying on third parties or internet connectivity.

## 5. Server Routes

This section outlines the backend API endpoints required for our application. These routes will handle interactions with our private blockchain node that do not require a user's private key, such as checking balances and distributing funds from a faucet.

### API Endpoints

We will implement the following server-side routes:

1.  **`GET /api/isAlive`**
    *   **Purpose**: A simple health check to verify that the server is running.
    *   **Returns**: `{ "alive": true }`

2.  **`GET /api/balance/:address`**
    *   **Purpose**: To query the balance of a specific Ethereum address.
    *   **Returns**: `{ "address": "0x...", "balance": "1000000000000000000", "date": "..." }`

3.  **`POST /api/faucet/:address/:amount`**
    *   **Purpose**: To send a specified amount of ETH from a pre-funded faucet account to a user's address.
    *   **Returns**: `{ "address": "0x...", "amount": "0.1", "date": "..." }`

**Architectural Note**: We do not need backend routes for user-to-user transfers. These transactions are handled directly on the frontend, where the user can sign them securely using MetaMask. This prevents sensitive data like private keys from ever touching our server.

### Testing with curl

You can test these endpoints from your terminal using `curl`:

```bash
# 1. Check if the server is alive
curl http://localhost:3000/api/isAlive

# 2. Query the balance of an address
curl http://localhost:3000/api/balance/0xYOUR_ADDRESS

# 3. Request 0.1 ETH from the faucet
curl -X POST http://localhost:3000/api/faucet/0xYOUR_ADDRESS/0.1
```

### Technical Implementation with `ethers.js`

The `ethers` library greatly simplifies backend interactions with the Ethereum node.

**Note on Ports**: Our local Geth node is running on port `5556`. Our backend server will run on port `3000`. (An initial attempt to use port 3333 failed as it was already in use, which was diagnosed using `lsof -i :3333`).

#### **Balance Endpoint (`/api/balance/:address`)**

To get an address's balance, we create a provider connected to our node and call the `eth_getBalance` JSON-RPC method via `ethers`.

```javascript
// Example handler for the balance route
import { ethers } from "ethers";

// ... inside an async express handler
const { address } = req.params;
const provider = new ethers.JsonRpcProvider("http://localhost:5556");
const balance = await provider.getBalance(address);

res.json({
    address: address,
    balance: balance.toString(), // BigInt must be converted to a string for JSON
    date: new Date()
});
```

#### **Faucet Endpoint (`/api/faucet/:address/:amount`)**

The faucet requires our server to have its own wallet to send funds. The process is as follows:

1.  **Load Faucet Wallet**: Read the encrypted keystore JSON file of our pre-funded validator/faucet account.
2.  **Create Provider**: Instantiate a `JsonRpcProvider` connected to our node (`http://localhost:5556`).
3.  **Decrypt Wallet**: Create a wallet instance from the encrypted keystore using its password: `ethers.Wallet.fromEncryptedJson(keystoreData, "password")`.
4.  **Connect Wallet to Provider**: This allows the wallet to query the network (for nonce, gas price, etc.) and send transactions.
5.  **Send Transaction**: Construct and send the transaction: `await wallet.sendTransaction({ to: address, value: ethers.parseEther(amount) })`.
6.  **Wait for Confirmation**: Optionally, wait for the transaction to be mined to ensure it was successful: `await tx.wait()`.

**Important**: All route handlers performing these actions must be `async` functions to correctly use `await`.

## 6. Frontend Setup

We will build the frontend from scratch using Vite, React, and TypeScript.

### Initial Project Setup

```bash
# Create a new Vite project with the React + TypeScript template
npm create vite@latest front -- --template react-ts

# Navigate into the new project directory and install dependencies
cd front
npm install
```

### Installation and Configuration of Tailwind CSS

```bash
# Install Tailwind CSS and its peer dependencies
npm install -D tailwindcss postcss autoprefixer

# Generate tailwind.config.js and postcss.config.js
npx tailwindcss init -p
```
Next, update the `content` array in `tailwind.config.js` and add the Tailwind directives to `src/index.css` as per the official documentation.

### Configuration for shadcn/ui

Before installing `shadcn/ui`, we need to configure path aliases for cleaner imports.

1.  **Update `tsconfig.json`**: Add `baseUrl` and `paths` to support the `@/*` alias.

    ```json
    "compilerOptions": {
        // ...
        "baseUrl": ".",
        "paths": {
          "@/*": ["./src/*"]
        }
    }
    ```

2.  **Install Node Types**: Required for path resolution.
    ```bash
    npm i -D @types/node
    ```

3.  **Update `vite.config.ts`**: Configure Vite to resolve the alias and adjust server settings for better development, especially within WSL2.

    ```javascript
    import path from "path";
    import { defineConfig } from 'vite'
    // ...

    export default defineConfig({
      // ...
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src"),
        },
      },
      server: {
        watch: {
          usePolling: true,  // Fixes HMR issues in some environments like WSL2
          interval: 1000,
        },
        host: true, // Allows access from the network
        port: 5173,
      }
    })
    ```

### Installation of shadcn/ui

```bash
# Initialize shadcn/ui in your project
npx shadcn-ui@latest init
```
This command creates `src/lib/utils.ts` (for merging Tailwind classes) and modifies `index.css` with CSS variables for theming. You can then add individual components as needed.

```bash
# Example: Add the Button component
npx shadcn-ui@latest add button
```
Components are added directly to your source tree, typically in `src/components/ui/`, giving you full control over their code.

## 7. React Application Architecture

With the project set up, we can define the core structure of our React application, focusing on routing and state management.

### 7.1. Routing with `react-router-dom`

The best way to structure a multi-page application is with a router. We'll use `react-router-dom`.

```bash
npm i react-router-dom
```

The core idea is to map URL paths to specific React components. We will create a main `Dashboard` layout that contains a shared `Header` and a dynamic content area for different pages like `Faucet`, `Balance`, etc.

**Example Implementation (`App.tsx`)**:

```tsx
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";

// 1. Define placeholder components (can be moved to separate files later)
export function Home() { return <div>Home</div>; }
export function Faucet() { return <div>Faucet</div>; }
export function Balance() { return <div>Balance</div>; }
export function Transfer() { return <div>Transfer</div>; }
export function Header() { return <div>Header with Navigation Links</div>; }

// 2. Define the main layout component
export function Dashboard() {
  return (
    <div className='container'>
      <Header />
      <h1 className="text-xl">Dashboard</h1>
      {/* The Outlet component renders the active child route */}
      <Outlet />
    </div>
  );
}

// 3. Create the router configuration
const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />, // The Dashboard is the layout for all nested routes
    children: [
      { path: "home", element: <Home /> },
      { path: "faucet", element: <Faucet /> },
      { path: "balance", element: <Balance /> },
      { path: "transfer", element: <Transfer /> }
    ]
  }
]);

// 4. The root App component provides the router to the application
export default function App() {
  return (
    <div>
      <RouterProvider router={router} />
    </div>
  );
}
```

**Key Concept: The `<Outlet />` Component**
The `<Outlet />` tag within the `Dashboard` component is a placeholder. When you navigate to a child route like `/faucet`, `react-router-dom` will render the `<Faucet />` component in place of the `<Outlet />`. This allows you to create persistent layouts with a shared `Header`, `Footer`, or `Sidebar`.

**Good Practice**: Start with simple components in one file. As they grow, refactor them into their own files (e.g., `src/components/Header.tsx`) and import them where needed. Clean imports lead to a more maintainable codebase.

### 7.2. Global State Management with React Context

Many components (`Header`, `Faucet`, `Balance`) will need to access shared information, like the user's connected MetaMask account address. Instead of passing this data down through many layers of props ("prop drilling"), we can use React's Context API to create a global state.

**Implementation (`App.tsx`)**:

```tsx
import React, { useState, useContext, createContext } from 'react';
// ... other imports

// 1. Create a Context
const UserContext = createContext(null);

// ... router configuration from before

export default function App() {
  // 2. Use useState to hold the global state
  const [user, setUser] = useState({
    acc: null // Initially, no account is connected
  });

  // 3. Wrap the application in the Context Provider
  // Pass both the state and the function to update it
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <div>
        <RouterProvider router={router} />
      </div>
    </UserContext.Provider>
  );
}

// In any child component, you can now access the global state:
// const { user, setUser } = useContext(UserContext);
```
By wrapping our entire app in `UserContext.Provider`, any component in the tree can access and modify the `user` state. When `setUser` is called, all components using this context will automatically re-render with the new data.

### 7.3. Interacting with MetaMask

To make our application useful, we need to connect to the user's MetaMask wallet.

1.  **Initial Connection**: We use the `useEffect` hook to attempt a connection when the app first loads.
2.  **Listening for Changes**: We must also listen for events, as the user can change their active account in MetaMask at any time.

**Example in a component (e.g., `Header.tsx`)**:

```tsx
import { useEffect, useContext } from 'react';
// ... import UserContext

export function Header() {
  const { user, setUser } = useContext(UserContext);

  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    // Function to handle account changes
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        console.log('Please connect to MetaMask.');
        setUser({ ...user, acc: null });
      } else if (accounts[0] !== user.acc) {
        // Update global state with the new account
        setUser({ ...user, acc: accounts[0] });
      }
    };

    // Request accounts on initial load
    ethereum.request({ method: 'eth_requestAccounts' })
      .then(handleAccountsChanged)
      .catch((err: Error) => console.error(err));

    // Set up the event listener for account changes
    ethereum.on('accountsChanged', handleAccountsChanged);

    // Clean up the listener when the component unmounts
    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <header>
      {/* Display the connected account */}
      <div>Connected Account: {user.acc || 'Not Connected'}</div>
    </header>
  );
}
```
This pattern ensures our application is always synchronized with the user's MetaMask wallet state.