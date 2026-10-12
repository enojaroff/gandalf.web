# gandalf.web

Web interface of Gandalf, a decision engine: decision tables, scoring tables,
decision flows, versions, decision history and account administration. The
back end is [gandalf.api](https://github.com/Claims-IA/gandalf.api).

User manual: [docs/manual](docs/manual/README.md) ([français](docs/manual/README.fr.md)).

This project is a fork of [Nebo15/gandalf.web](https://github.com/Nebo15/gandalf.web),
an AngularJS application, rewritten with Nuxt 3. The original application and
its tooling have been removed.

## Stack

- [Nuxt 3](https://nuxt.com) in SPA mode (`ssr: false`), with a small Nitro
  server that proxies `/api` to gandalf.api
- [Nuxt UI 3](https://ui.nuxt.com) (Tailwind CSS 4), Pinia, Vue Flow (flow editor)
- [@nuxtjs/i18n](https://i18n.nuxtjs.org): French, English, Italian, Spanish,
  Ukrainian, Bulgarian (`locales/`)
- [Vitest](https://vitest.dev) for unit tests (`utils/__tests__/`)

## Development

Requirements: Node.js 20 and a running gandalf.api.

```bash
cp .env.example .env   # then set the API endpoint and the OAuth client
npm install
npm run dev            # serves the app on the port set by PORT
```

Other commands:

```bash
npm test               # unit tests (vitest)
npx nuxi typecheck     # TypeScript check
npm run build          # production build in .output/
npm run preview        # serve the production build
```

## Configuration

The values below are read from `.env` when the app is built or started in
development. In a built app, override them at runtime with the `NUXT_`
variables.

| Variable | Runtime override | Description |
| -------- | ---------------- | ----------- |
| `PORT` | `PORT` | Port of the Nuxt server (5177 in the Docker image). |
| `API_ENDPOINT` | `NUXT_API_ENDPOINT` | Base URL of gandalf.api, used by the `/api` proxy. |
| `API_CLIENTID` | `NUXT_PUBLIC_API_CLIENT_ID` | OAuth client id registered in gandalf.api. |
| `API_CLIENTSECRET` | `NUXT_PUBLIC_API_CLIENT_SECRET` | OAuth client secret. |

## Docker

```bash
docker build -t gandalf-web .
docker run -p 5177:5177 \
  -e NUXT_API_ENDPOINT=https://api.example.com/ \
  -e NUXT_PUBLIC_API_CLIENT_ID=... \
  -e NUXT_PUBLIC_API_CLIENT_SECRET=... \
  gandalf-web
```

The image runs the standalone Nitro build (`node .output/server/index.mjs`).

## Project layout

| Folder | Content |
| ------ | ------- |
| `pages/`, `layouts/`, `components/` | Screens and UI components |
| `composables/useGandalf.ts` | API client |
| `stores/` | Pinia stores (session, current application, user) |
| `utils/` | Pure helpers, tested in `utils/__tests__/` |
| `server/` | Nitro: `/api` proxy and plugins |
| `locales/` | Translations |
| `docs/manual/` | User manual (English and French) |
| `design/` | Source of the logo (Affinity Designer) |

## License

GNU General Public License v3.0, see [LICENSE](LICENSE). Original work by
Nebo15.
