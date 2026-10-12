// Routes de gandalf.api authentifiées par le client OAuth de l'interface
// (middleware oauth.basic.client, et l'émission des jetons) : le proxy /api
// leur ajoute les identifiants du client, qui ne quittent jamais le serveur.
const CLIENT_ROUTES = new Set([
  'POST v1/oauth',
  'GET v1/users/username',
  'POST v1/users',
  'POST v1/users/verify/email',
  'POST v1/users/verify/email/resend',
  'POST v1/users/password/reset',
  'PUT v1/users/password/reset',
])

// `path` : le chemin sous /api, avec ou sans barres obliques aux extrémités.
export function needsClientCredentials(method: string, path: string): boolean {
  return CLIENT_ROUTES.has(`${method.toUpperCase()} ${path.replace(/^\/+|\/+$/g, '')}`)
}

// En-tête Basic du client OAuth, côté serveur seulement (Node).
export function clientAuthorization(clientId: string, clientSecret: string): string {
  return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
}
