# Diffusion privée d’une scène

La diffusion (« stream ») est une couche Cloudflare facultative. La campagne complète reste la source de vérité locale du propriétaire ; D1 ne reçoit que la projection publique de la scène active et l’état des indicateurs publics.

## Frontière de données

`shared/scene-stream-protocol.js` construit côté serveur une vue par liste blanche. Aucun objet de campagne n’est copié par spread vers la réponse publique.

Ne quittent jamais le serveur :

- les personnages dissimulés ;
- les indicateurs secrets ou invisibles ;
- les notes de scène, de réserve et de personnage ;
- les automatismes, seuils, jets rapides, règles et métadonnées internes ;
- la structure complète de la campagne.

Une ligne D1 d’indicateur est identifiée par `(stream, scène, participant, indicateur)`. Les séries de cases et les compteurs composés restent une seule valeur atomique. La version augmente quand la valeur ou la définition publique de cet indicateur change.

## Lien et routes

Le propriétaire connecté crée ou révoque le lien dans **Campagnes → Synchronisation privée**.

- `POST/DELETE /api/stream/link` : rotation ou révocation, avec session, origine fiable et CSRF ;
- `PUT/GET /api/stream/owner` : publication de la scène et réception des changements invités ;
- `GET/PATCH /api/stream` : lecture et écriture invitées avec le jeton Bearer.

Le jeton aléatoire de 256 bits est placé dans le fragment `#/stream/<jeton>`. Le fragment n’est pas envoyé dans l’URL HTTP, le Referer ou les journaux d’accès. Seul son SHA-256 est conservé dans D1. Le jeton brut reste dans la mémoire React et le `sessionStorage` de l’onglet qui l’a créé ; après fermeture de cet onglet, il faut régénérer le lien pour le recopier.

La mise sur off conserve le stream, son token et ses indicateurs : le même lien refonctionne après réactivation. Pendant la pause, aucune vue ni écriture n’est servie aux invités et aucune publication propriétaire n’est envoyée. Une page invitée déjà ouverte s’arrête sur un écran de pause sans polling et propose une vérification manuelle. La régénération et la révocation définitive suppriment immédiatement l’ancien stream et ses indicateurs. Le schéma conserve néanmoins un identifiant de stream distinct du propriétaire afin de permettre plusieurs liens dans une version future.

Quand le propriétaire est connecté, le menu de la scène permet aussi de générer le lien, de le copier et de basculer la diffusion entre on et off. Une déconnexion met automatiquement le lien sur off après la fermeture de la dernière session active du propriétaire ; elle ne le révoque jamais. Les sessions expirées et les comptes désactivés suivent la même règle.

Un stream est également fermé après 2 heures sans modification publique, propriétaire ou invitée. Les lectures, réponses `204` et écritures refusées ne prolongent pas cette durée. L’expiration est paresseuse : la première requête suivante révoque conditionnellement le stream, sans cron ni Function maintenue active. Si une modification concurrente vient de le rafraîchir, la révocation échoue et la requête relit la version récente. Un tombstone léger est conservé jusqu’au prochain lien afin que le propriétaire voie l’échéance courante puis un message de fermeture, même si un invité a constaté l’expiration en premier.

## Écritures et conflits

Un indicateur est modifiable seulement si toutes les conditions serveur sont réunies :

- participant visible de comportement PJ ;
- indicateur visible et non secret ;
- option `streamEditable` explicitement activée ;
- indicateur non calculé et non lecture seule ;
- valeur conforme à sa structure et à ses bornes publiques.

Le client regroupe les interactions rapides pendant 450 ms par indicateur. La validation d’un nombre, la fermeture ou le changement de fiche, le passage en arrière-plan et la fermeture de page forcent le drainage de la file.

Chaque écriture envoie `baseVersion`. L’UPDATE D1 est conditionnel à cette version et au droit courant. Un trigger SQLite incrémente atomiquement la révision globale lorsque la valeur publique change. La publication propriétaire utilise un upsert JSON groupé dans un batch D1 : un pending invité est conservé si le propriétaire n’a pas changé la valeur, acquitté s’il l’a appliqué, et remplacé si le propriétaire a produit une valeur ou une définition plus récente.

## Rafraîchissement

Le polling est adaptatif et partagé par les clients propriétaire et invité. Après des réponses inchangées, sa cadence progresse doucement de `3` à `5`, `8`, `12` secondes, puis vers le plafond correspondant à l’attention probable :

- fenêtre focalisée : plafond de 12 secondes, progressivement porté à 30 secondes entre 2 et 10 minutes sans modification ni interaction significative ;
- fenêtre visible sans focus mais survolée pendant au moins 3 secondes dans les 2 dernières minutes : plafond de 20 secondes ;
- fenêtre visible sans attention récente : plafond de 45 secondes, puis suspension après 10 minutes sans modification publique ;
- fenêtre ou onglet non visible : aucune requête.

Le focus, une action explicite ou un survol continu de 3 secondes réveillent une vue suspendue et déclenchent au plus une vérification immédiate. Un simple passage du pointeur ne suffit pas. Les écritures en attente sont drainées avant la mise en arrière-plan.

Une réponse modifiée contient l’heure du serveur. L’âge de la dernière modification et l’intervalle observé avec la précédente déterminent la reprise : seules des modifications récentes et rapprochées reviennent à 3 secondes. Une modification déjà ancienne est affichée sans rafale inutile. Les erreurs réseau suivent un backoff de 5 à 60 secondes et l’événement `online` provoque une reconnexion immédiate lorsque la vue mérite d’être active.

Les écritures invitées utilisent un lot multi-indicateurs. Une modification isolée part après 450 ms de calme ; pendant une activité continue, un seul lot contenant la dernière valeur de chaque indicateur part au maximum toutes les 5 secondes. La cadence automatique est ainsi limitée à 120 requêtes sur 10 minutes, indépendamment du nombre d’indicateurs manipulés dans chaque lot. Chaque requête est limitée à 32 indicateurs et vise au plus 56 Ko UTF-8 sous la limite serveur de 64 Ko ; le client découpe automatiquement un lot plus grand. Un `413` inattendu réduit encore le lot, tandis qu’un indicateur isolé dépassant réellement la limite est refusé une seule fois sans boucle de retry. La valeur affichée reste optimiste. La validation, la fermeture de fiche, le changement de personnage ou de scène et les drains `keepalive` forcent immédiatement le lot final et sont donc volontairement hors de ce plafond. Une réponse `429` respecte `Retry-After` et, si cet en-tête manque, attend 10 secondes avant toute nouvelle tentative.

Si `since` correspond à la révision courante, la Function renvoie `204` sans lire les indicateurs ni renvoyer la vue. Les réponses plus anciennes sont ignorées et une seule boucle de polling peut être active. Un lien invalide ou révoqué reçoit la même réponse `404` générique et arrête définitivement sa boucle.

## Déploiement

Appliquer les migrations D1, notamment :

```bash
npx wrangler d1 migrations apply cadence-private --remote
```

La migration [`0004_private_scene_stream.sql`](../migrations/0004_private_scene_stream.sql) ajoute les streams, les états versionnés et le trigger de révision. La migration [`0005_pause_scene_stream.sql`](../migrations/0005_pause_scene_stream.sql) ajoute la suspension réversible du même lien. Déployer ensuite avec la commande habituelle `npm run build:cloudflare`.

`public/_routes.json` limite l’exécution des Pages Functions à `/api/*`; les ressources statiques ne consomment donc pas le quota Workers.

### Rate limiting Cloudflare facultatif

Le déploiement privé actuel ne nécessite pas de règle serveur supplémentaire. Si le lien devait un jour être distribué hors d’un cercle de confiance, Pages Functions ne prend pas en charge le binding Rate Limiting natif des Workers. Sur le plan gratuit, une règle **Security → WAF → Rate limiting rules** pourrait alors être créée avant la Function :

- expression : `http.request.uri.path eq "/api/stream"` ;
- caractéristique : IP ;
- seuil initial : 30 requêtes par période de 10 secondes ;
- action : blocage pendant 10 secondes, avec le statut HTTP `429`.

La route exacte protégerait les lectures et écritures publiques sans englober `/api/stream/owner` ni `/api/stream/link`. Le plan gratuit agrège nécessairement par IP : plusieurs invités derrière le même accès Internet partageraient donc le seuil. Cette règle n’est pas activée pour la V1 ; le cadenceur client protège uniquement l’usage normal de l’interface.

## Limites V1

- un lien actif par propriétaire et des droits identiques pour tous ses détenteurs ;
- aucune identité joueur ni attribution de personnage ;
- pas de jets partagés ni de modification de structure ;
- polling HTTP, sans WebSocket ni Durable Object ;
- cadenceur client et compatibilité `429`, mais la règle WAF Cloudflare doit être configurée séparément sur le domaine ;
- taille maximale : 1 Mo pour la scène reçue par la Function et 500 Ko pour sa projection publique.
