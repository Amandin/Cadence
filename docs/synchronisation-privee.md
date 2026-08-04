# Comptes privés et synchronisation

Cadence conserve toujours la campagne dans le navigateur. La synchronisation est une couche facultative réservée aux comptes créés manuellement : aucune route ni aucun écran ne permet de s’inscrire.

## Architecture

- Cloudflare Pages sert l’application React et les fonctions de `functions/`.
- D1 contient les comptes, les sessions, une base de campagne par compte et les petits patchs incrémentaux qui suivent.
- Le navigateur garde la copie locale et envoie les changements après 30 secondes d’inactivité.
- Les contrôles périodiques ne récupèrent que la révision et le hash SHA-256. Le `.cad` complet n’est téléchargé que si les hashes divergent.
- Les modifications courantes sont envoyées sous forme de patchs ciblés. Une sauvegarde complète consolide la campagne après 100 patchs, lors du premier envoi ou d’un remplacement explicite.
- Chaque sauvegarde distante porte une révision. Deux appareils qui ont modifié la même campagne ne s’écrasent pas silencieusement : l’interface demande quelle version conserver.
- Une version distante plus récente est vérifiée au retour dans l’application et toutes les 5 minutes.
- Quand l’onglet passe en arrière-plan, un petit patch en attente est envoyé avec `keepalive`. L’avertissement natif de fermeture n’apparaît que si la requête dépasse 48 Kio.

Les mots de passe sont dérivés par PBKDF2-SHA-256 avec un sel propre au compte et 100 000 itérations, limite compatible avec le runtime Cloudflare. Les sessions utilisent un cookie `HttpOnly`, `Secure` et `SameSite=Strict`. Les écritures exigent aussi un jeton CSRF et une origine autorisée.

## 1. Créer la base D1

Dans Cloudflare :

1. Créer une base D1, par exemple `cadence-private`.
2. Lier cette base au projet Pages avec le nom de variable exact `DB`, pour Production et Preview.
3. Exécuter [`migrations/0001_private_accounts_and_sync.sql`](../migrations/0001_private_accounts_and_sync.sql) dans la console D1.

En ligne de commande, après avoir installé Wrangler :

```bash
npx wrangler d1 migrations apply cadence-private --remote
```

La migration `0002_account_usernames.sql` ajoute la colonne de pseudo. La migration `0003_incremental_campaign_sync.sql` ajoute les hashes et les patchs de synchronisation. Les migrations `0004_private_scene_stream.sql` et `0005_pause_scene_stream.sql` ajoutent la [diffusion privée d’une scène](./diffusion-privee.md) et sa suspension réversible. Appliquer toutes les migrations encore absentes avant de déployer cette version.

Le fichier [`wrangler.example.toml`](../wrangler.example.toml) montre la configuration attendue. Copier ses valeurs dans la configuration Cloudflare ou créer un `wrangler.toml` local non sensible avec le véritable identifiant D1.

## 2. Autoriser le domaine

Ajouter la variable Pages `ALLOWED_ORIGINS`, avec les origines exactes séparées par des virgules :

```txt
https://cadence.example,https://www.cadence.example
```

L’origine courante reste automatiquement acceptée. La variable sert surtout aux domaines personnalisés et aux previews explicitement autorisées.

## 3. Créer les quelques comptes autorisés

Depuis le dossier du projet :

```bash
npm run account:create -- ami "Prénom"
```

Le mot de passe est demandé sans être affiché. Le script produit une instruction SQL ne contenant jamais le mot de passe en clair. Exécuter cette instruction dans la console D1.

Pour ton propre compte administrateur :

```bash
npm run account:create -- moi "Mon prénom" --admin
```

Le rôle administrateur est préparé pour de futures fonctions d’administration, mais ne donne actuellement accès à aucun écran de création de comptes. Cela maintient volontairement la liste des membres sous contrôle direct de la base.

Dans un environnement non interactif, le script accepte aussi la variable temporaire `CADENCE_ACCOUNT_PASSWORD`. Ne jamais l’enregistrer dans un fichier, une commande partagée ou un journal CI.

Pour renouveler le mot de passe d’un compte sans supprimer sa campagne :

```bash
npm run account:create -- ami "Prénom" --replace
```

## 4. Déployer

Les réglages Pages restent :

- commande de build : `npm run build:cloudflare`
- dossier de sortie : `dist`
- fonctions : détectées automatiquement dans `functions/`

Après déploiement, ouvrir **Campagnes → Synchronisation privée**.

Au premier téléphone ou ordinateur :

1. se connecter ;
2. choisir **Envoyer cette campagne** si le compte est vide ;
3. laisser la synchronisation automatique prendre le relais.

Sur le second appareil :

1. se connecter ;
2. choisir **Récupérer la version en ligne** ;
3. vérifier le nom de la campagne et les scènes.

## Exploitation

Pour couper immédiatement un compte :

```sql
UPDATE accounts SET disabled = 1 WHERE username = 'ami';
DELETE FROM sessions WHERE user_id = (SELECT id FROM accounts WHERE username = 'ami');
```

Pour le réactiver :

```sql
UPDATE accounts SET disabled = 0, failed_login_count = 0, locked_until = NULL WHERE username = 'ami';
```

La suppression d’un compte supprime aussi ses sessions et sa campagne grâce aux clés étrangères. Faire un export `.cad` avant toute suppression définitive.

## Limites volontaires de cette première version

- une campagne synchronisée par compte ;
- pas d’inscription, récupération de mot de passe ou partage entre comptes ;
- pas de fusion automatique de deux versions divergentes ;
- la bibliothèque reste incluse dans la campagne synchronisée, comme dans un export `.cad`.

Ces limites gardent le système petit et adapté à un cercle privé.
