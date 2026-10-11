# Gestion des comptes

[English version](accounts.md) · [Sommaire du manuel](README.fr.md)

Un **compte** donne accès à Gandalf. Il peut être **membre** de plusieurs
**applications**, avec dans chacune un **rôle** et des **droits** qui lui sont
propres. Ce chapitre explique ces notions, puis comment créer, modifier et
supprimer un compte.

## Sommaire

- [Notions](#notions)
- [Rôles](#rôles)
- [Droits](#droits)
- [Créer un compte](#créer-un-compte)
- [Se connecter](#se-connecter)
- [Modifier un compte](#modifier-un-compte)
- [Retirer un membre ou supprimer un compte](#retirer-un-membre-ou-supprimer-un-compte)
- [Créer et supprimer une application](#créer-et-supprimer-une-application)
- [Qui peut faire quoi](#qui-peut-faire-quoi)
- [Limites actuelles](#limites-actuelles)

---

## Notions

| Notion | Ce que c'est |
| ------ | ------------ |
| Compte | Une personne : un nom d'utilisateur, une adresse e-mail et un mot de passe. |
| Application | Un espace de travail : ses tables, ses flows, ses décisions, ses clés d'API et ses membres. Le sélecteur en haut de l'écran choisit l'application en cours. |
| Membre | Un compte rattaché à une application, avec un rôle et des droits dans cette application. Ses rôles et droits dans une autre application peuvent être différents. |
| Clé d'API | L'accès d'un logiciel (et non d'une personne) à une application, pour exécuter des décisions. Elle se gère dans **Paramètres**, carte « Consommateurs API ». |

---

## Rôles

Le rôle et les droits sont **indépendants**. Les droits disent ce qu'un membre
peut faire dans l'application ; le rôle dit s'il la gouverne. Être admin ne
donne aucun droit à lui seul.

| Rôle | Qui | En plus de ses droits |
| ---- | --- | --------------------- |
| **Membre** (« Member ») | Un compte rattaché à l'application, avec tout autre rôle que admin | Rien : il fait ce que ses droits permettent. |
| **Admin d'application** (« Admin ») | Un membre avec le rôle admin. Il peut être un utilisateur du client | Gère les admins et les comptes de son application (voir ci-dessous). |
| **Superadmin** | Un compte Claims IA, désigné sur le serveur par Claims IA | Crée et supprime les applications ; agit comme un admin qui a tous les droits dans **toutes** les applications. |

Le rôle est enregistré pour chaque membre, et seule la valeur **admin** a un
effet. La colonne « Rôle » de la liste des utilisateurs affiche la valeur
enregistrée : `admin`, `member`, ou, sur des comptes plus anciens, `manager`
(rôle que donnait l'ancienne interface) ou `user`. `member`, `manager` et
`user` ont exactement le même effet : ce sont de simples membres, et ce qu'ils
peuvent faire dépend uniquement de leurs droits. Le superadmin n'est pas un
rôle dans une application : c'est une propriété du compte.

Ce que le rôle **admin** ajoute :

- **gérer les admins** : inviter quelqu'un avec le rôle admin ou ajouter un
  compte comme admin, modifier les droits d'un admin ou le retirer de
  l'application. Un membre qui a le droit
  de gérer les collaborateurs gère les autres membres, mais ne peut pas
  toucher à un admin ;
- **gérer les comptes** : confirmer un compte à la place de la personne,
  renvoyer ou annuler une invitation, supprimer un compte ;
- **copier ou déplacer** des tables et des flows vers une autre application ;
- **faire fonctionner l'application** : elle n'exécute des décisions que si
  elle a au moins un admin dont le compte est actif.

Le **superadmin**, réservé à Claims IA :

- voit toutes les applications dans le sélecteur et le lien **Administration** ;
- agit dans chaque application comme un admin qui a tous les droits, même s'il
  n'en est pas membre. Il n'apparaît pas dans la liste des utilisateurs de ces
  applications ;
- crée les applications et nomme leurs admins, supprime les applications ;
- chacune de ses actions est enregistrée dans un journal, consultable dans
  **Administration**, onglet « Journal ».

---

## Droits

Les droits se cochent par groupe dans les fenêtres « Inviter », « Ajouter un
compte » et « Modifier le collaborateur ». Les libellés y sont en anglais ;
le tableau les reprend tels qu'ils s'affichent. « View » des tables est coché
d'office, et ces fenêtres refusent d'enregistrer sans lui.

| Groupe à l'écran | Droit à l'écran | Permet |
| ---------------- | --------------- | ------ |
| Project | Change Settings | Modifier le nom, la description et les réglages de l'application, gérer ses catégories, exporter ses données. |
| Decision Tables | View | Voir les tables, les flows, leurs versions, leurs révisions et leurs statistiques. **Indispensable** : sans lui, le membre ne voit rien de l'application. |
| Decision Tables | Create | Créer, copier et importer des tables et des flows ; les copier vers une autre application (admin seulement). |
| Decision Tables | Update | Modifier les tables et les flows, créer et modifier des brouillons, tester un brouillon, revenir à une révision. |
| Decision Tables | Delete | Supprimer des tables et des flows ; avec « Create », les déplacer vers une autre application (admin seulement). |
| Decision Tables | Publish | Publier un brouillon (il devient une version numérotée) ; supprimer une version publiée. |
| Decision Tables | Activate | Mettre une version en production (l'activer) ; changer la répartition des variantes d'une version publiée. |
| Decision History | View | Consulter l'historique des décisions et le détail d'une décision. |
| Decision History | Make | Exécuter des décisions, tester une version publiée, annoter une décision. |
| Decision History | Make API call for inactive versions | Exécuter une version publiée qui n'est pas la version active ; donner ce droit à une clé d'API. |
| API Consumer Credentials | Read | Voir les clés d'API de l'application. |
| API Consumer Credentials | Manage | Créer, modifier et supprimer des clés d'API. |
| Project Collaborators | Manage | Voir et gérer les membres : inviter, ajouter un compte, modifier les droits, retirer de l'application. |

Règles qui s'appliquent à toute attribution de droits :

- **personne ne donne plus de droits qu'il n'en a**, à un membre comme à une
  clé d'API ;
- **personne ne modifie ses propres droits** et personne ne se retire
  lui-même d'une application ;
- **seul un admin modifie ou retire un admin.**

Un admin reçoit ses droits comme tout membre : ceux cochés dans son
invitation. On peut donc, par exemple, avoir un admin côté client qui gère son
équipe mais à qui l'on ne donne pas « Activate » : il ne met rien en
production lui-même.

---

## Créer un compte

### S'inscrire soi-même

1. Sur la page de connexion, cliquer sur **S'inscrire**.
2. Saisir un nom d'utilisateur, une adresse e-mail et un mot de passe, puis
   **Créer un compte**.
3. Ouvrir le lien reçu par e-mail pour activer le compte. Le lien est valable
   1 heure.

Un compte neuf n'est rattaché à aucune application : la page d'accueil
demande de contacter l'admin de son application, ou Claims IA. Le bouton
**Actualiser** vérifie si une invitation a été acceptée entre-temps.

Si une invitation attendait déjà cette adresse e-mail, le compte rejoint
automatiquement l'application concernée à l'inscription.

### Être invité

Dans **Paramètres**, carte « Utilisateurs », bouton **Inviter** (droit
« Manage » des collaborateurs) :

1. Saisir l'adresse e-mail de la personne.
2. Choisir le rôle : **Member** ou **Admin** (inviter un admin est réservé aux
   admins).
3. Cocher ses droits (« View » des tables est déjà coché, et obligatoire).
4. **Envoyer une invitation**.

L'invitation apparaît dans la liste avec le statut **Invité**. Ensuite :

- **la personne n'a pas encore de compte** : elle s'inscrit avec cette
  adresse et rejoint l'application. Un admin peut aussi cliquer sur
  **Confirmer** : le compte est alors créé et activé, et un **mot de passe
  temporaire** s'affiche, à lui transmettre ;
- **la personne a déjà un compte** : un admin clique sur **Confirmer** pour
  l'ajouter à l'application.

Sur une ligne « Invité », l'icône d'enveloppe **renvoie l'invitation** et la
croix **l'annule** (admin).

### Ajouter un compte existant

Bouton **Ajouter un compte** : rechercher le compte par nom d'utilisateur ou
par e-mail, choisir son rôle et cocher ses droits, puis **Ajouter**. Le compte
rejoint l'application tout de suite, sans invitation :

- **Member** : avec les droits cochés ;
- **Admin** (proposé aux seuls admins) : comme admin, avec les droits cochés.
  Si la nomination échoue, le compte reste membre et un message l'indique.

### Statuts dans la liste des utilisateurs

| Statut | Signification | Action possible (admin) |
| ------ | ------------- | ----------------------- |
| **Actif** | Le compte est activé et membre de l'application. | Modifier ses droits, le retirer, supprimer le compte. |
| **En attente** | Le compte existe mais son adresse e-mail n'est pas vérifiée. | **Confirmer** : active le compte comme si la personne avait cliqué sur le lien. |
| **Invité** | Une invitation attend la personne. | **Confirmer**, renvoyer ou annuler l'invitation. |

Votre propre ligne porte le badge **Vous** et ne propose aucune action : on
ne modifie ni ne retire son propre compte.

---

## Se connecter

Sur la page de connexion, le champ « Utilisateur » accepte le **nom
d'utilisateur ou l'adresse e-mail** (l'adresse confirmée du compte).

**Mot de passe oublié ?** envoie un lien de réinitialisation à l'adresse du
compte, valable 1 heure. Le lien ouvre une page où saisir le nouveau mot de
passe.

Le mot de passe doit faire entre 8 et 32 caractères et contenir au moins une
majuscule, une minuscule et un chiffre, sans espace.

---

## Modifier un compte

### Son propre profil

Menu du compte (en haut à droite) > **Modifier le profil** :

- nom d'utilisateur, prénom, nom et adresse e-mail ;
- le **mot de passe actuel** est demandé pour enregistrer ces changements ;
- le nom d'utilisateur doit rester unique : il change dès l'enregistrement ;
- l'adresse e-mail doit rester unique (voir
  [Limites actuelles](#limites-actuelles)).

La carte **Préférences** (mode de navigation de l'éditeur de flow) s'enregistre
sans mot de passe.

Pour changer de mot de passe, utiliser **Mot de passe oublié ?** sur la page
de connexion.

### Les droits d'un membre

Dans **Paramètres**, carte « Utilisateurs », le crayon d'une ligne ouvre
**Modifier le collaborateur** : on y coche ou décoche ses droits, puis
**Enregistrer**. Le rôle s'affiche mais ne se modifie pas.

Le crayon n'apparaît pas sur sa propre ligne, ni, pour un membre qui n'est pas
admin, sur la ligne d'un admin.

---

## Retirer un membre ou supprimer un compte

Les deux actions se trouvent dans **Modifier le collaborateur**.

| Action | Effet | Qui |
| ------ | ----- | --- |
| **Retirer de l'application** | Le compte quitte cette application. Il existe toujours et garde ses autres applications. | Droit « Manage » des collaborateurs ; admin pour retirer un admin. |
| **Supprimer le compte** | Suppression **définitive** du compte. Pour confirmer, saisir son adresse e-mail. | Admin, avec le droit « Manage » des collaborateurs. |

La suppression d'un compte est refusée :

- s'il est encore membre d'une autre application : le retirer d'abord des
  applications indiquées ;
- pour son propre compte ;
- pour le compte d'un superadmin.

---

## Créer et supprimer une application

Réservé aux superadmins.

- **Créer** : bouton **Nouvelle application** en haut de l'écran, ou dans
  **Administration**. Saisir le nom, une description, et l'adresse e-mail de
  l'admin de l'application : il est invité avec le rôle admin et tous les
  droits. Le superadmin n'est pas membre de l'application créée ; la page de
  ses paramètres s'ouvre pour confirmer le compte de l'admin si besoin.
- **Supprimer** : **Administration**, onglet « Applications », icône de
  corbeille, puis saisir le nom exact de l'application. La suppression est
  définitive et journalisée.

Une application sans admin actif n'exécute pas de décisions : la page
**Administration** la signale par le badge « Aucun admin ».

---

## Qui peut faire quoi

| Action | Qui |
| ------ | --- |
| S'inscrire | Tout le monde |
| Modifier son profil | Soi-même |
| Voir les membres d'une application | Droit « Manage » des collaborateurs |
| Inviter un membre | Droit « Manage » des collaborateurs |
| Inviter un admin | Admin, avec le droit « Manage » des collaborateurs |
| Ajouter un compte existant comme membre | Droit « Manage » des collaborateurs |
| Ajouter un compte existant comme admin | Admin, avec le droit « Manage » des collaborateurs |
| Confirmer un compte, renvoyer ou annuler une invitation | Admin, avec le droit « Manage » des collaborateurs |
| Modifier les droits d'un membre | Droit « Manage » des collaborateurs, jamais les siens |
| Modifier les droits d'un admin | Admin, avec le droit « Manage » des collaborateurs |
| Retirer un membre de l'application | Droit « Manage » des collaborateurs, jamais soi-même |
| Retirer un admin de l'application | Admin, avec le droit « Manage » des collaborateurs |
| Supprimer un compte | Admin, avec le droit « Manage » des collaborateurs |
| Créer ou supprimer une application | Superadmin |
| Nommer ou retirer un superadmin | Claims IA, sur le serveur |

Dans tous les cas, personne ne donne plus de droits qu'il n'en a.

---

## Limites actuelles

Points connus, en attente de correction :

- **Changement d'adresse e-mail** : sur un serveur où les comptes sont
  activés sans vérification, il est immédiat. Sinon, la nouvelle adresse
  attend une confirmation, mais aucun e-mail de confirmation n'est envoyé :
  l'ancienne adresse reste celle du compte.
- **Mot de passe** : il ne se change pas depuis le profil ; utiliser
  **Mot de passe oublié ?**. Le mot de passe temporaire donné à la
  confirmation d'une invitation n'a pas à être changé, contrairement à ce
  qu'indique le message.
- **Rôle admin** : un membre existant ne peut pas être nommé admin
  directement. Le retirer de l'application, puis l'ajouter de nouveau avec
  **Ajouter un compte** et le rôle Admin.
- **E-mail de vérification** : il ne peut pas être renvoyé. Un admin peut
  activer le compte avec **Confirmer**.
- **Page Paramètres** : un membre qui n'a pas le droit « Manage » des
  collaborateurs voit un message d'erreur au chargement et une liste
  d'utilisateurs vide.
- **Langue** : les libellés des droits, la page d'activation du compte et la
  page du nouveau mot de passe sont en anglais.
