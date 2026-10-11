# Account management

[Version française](accounts.fr.md) · [Manual contents](README.md)

An **account** gives access to Gandalf. It can be a **member** of several
**applications**, with a **role** and **rights** of its own in each one. This
chapter explains these notions, then how to create, change and delete an
account.

The French interface is the reference: screen labels are quoted as they
appear in French, with their English meaning.

## Contents

- [Notions](#notions)
- [Roles](#roles)
- [Rights](#rights)
- [Creating an account](#creating-an-account)
- [Signing in](#signing-in)
- [Changing an account](#changing-an-account)
- [Removing a member or deleting an account](#removing-a-member-or-deleting-an-account)
- [Creating and deleting an application](#creating-and-deleting-an-application)
- [Who can do what](#who-can-do-what)
- [Current limitations](#current-limitations)

---

## Notions

| Notion | What it is |
| ------ | ---------- |
| Account | A person: a username, an email address and a password. |
| Application | A workspace: its tables, flows, decisions, API keys and members. The selector at the top of the screen picks the current application. |
| Member | An account attached to an application, with a role and rights in that application. Its role and rights in another application can differ. |
| API key | Access for software (not a person) to an application, to run decisions. Managed in **Paramètres** (Settings), "Consommateurs API" card. |

---

## Roles

Role and rights are **independent**. Rights say what a member can do in the
application; the role says whether they govern it. Being admin grants no
right by itself.

| Role | Who | On top of their rights |
| ---- | --- | ---------------------- |
| **Member** ("Member") | An account attached to the application | Nothing: they do what their rights allow. |
| **Application admin** ("Admin") | A member with the admin role. Can be one of the client's users | Manages the admins and the accounts of their application (see below). |
| **Superadmin** | A Claims IA account, appointed on the server by Claims IA | Creates and deletes applications; acts as an admin holding every right in **every** application. |

What the **admin** role adds:

- **managing admins**: inviting someone with the admin role, changing an
  admin's rights or removing them from the application. A member who may
  manage collaborators manages the other members, but cannot touch an admin;
- **managing accounts**: confirming an account on the person's behalf,
  resending or cancelling an invitation, deleting an account;
- **copying or moving** tables and flows to another application;
- **keeping the application running**: it runs decisions only while it has at
  least one admin whose account is active.

The **superadmin**, reserved to Claims IA:

- sees every application in the selector, and the **Administration** link;
- acts in every application as an admin holding every right, even without
  being a member. They do not appear in the user list of those applications;
- creates applications and names their admins, deletes applications;
- every one of their actions is recorded in a log, shown in
  **Administration**, "Journal" tab.

---

## Rights

Rights are ticked by group in the "Inviter" (Invite), "Ajouter un compte"
(Add an account) and "Modifier le collaborateur" (Edit collaborator) windows.
Their labels are shown in English on screen.

| Group on screen | Right on screen | Allows |
| --------------- | --------------- | ------ |
| Project | Change Settings | Changing the application's name, description and settings, managing its categories, exporting its data. |
| Decision Tables | View | Seeing tables, flows, their versions, revisions and statistics. **Essential**: without it, the member sees nothing of the application. |
| Decision Tables | Create | Creating, copying and importing tables and flows; copying them to another application (admin only). |
| Decision Tables | Update | Changing tables and flows, creating and editing drafts, testing a draft, rolling back to a revision. |
| Decision Tables | Delete | Deleting tables and flows; with "Create", moving them to another application (admin only). |
| Decision Tables | Publish | Publishing a draft (it becomes a numbered version); deleting a published version. |
| Decision Tables | Activate | Putting a version in production (activating it); changing the variant split of a published version. |
| Decision History | View | Browsing the decision history and a decision's details. |
| Decision History | Make | Running decisions, testing a published version, annotating a decision. |
| Decision History | Make API call for inactive versions | Running a published version that is not the active one; giving this right to an API key. |
| API Consumer Credentials | Read | Seeing the application's API keys. |
| API Consumer Credentials | Manage | Creating, changing and deleting API keys. |
| Project Collaborators | Manage | Seeing and managing members: inviting, adding an account, changing rights, removing from the application. |

Rules that apply whenever rights are given:

- **nobody gives more rights than they hold**, to a member or to an API key;
- **nobody changes their own rights**, and nobody removes themselves from an
  application;
- **only an admin changes or removes an admin.**

An admin gets their rights like any member: those ticked in their invitation.
For instance, a client-side admin can manage their team without "Activate":
they never put anything in production themselves.

---

## Creating an account

### Signing up

1. On the sign-in page, click **S'inscrire** (Sign up).
2. Enter a username, an email address and a password, then **Créer un
   compte** (Create an account).
3. Open the link received by email to activate the account. The link is
   valid for 1 hour.

A new account belongs to no application: the welcome page asks the person to
contact their application's admin, or Claims IA. The **Actualiser**
(Refresh) button checks whether an invitation was accepted meanwhile.

If an invitation was already waiting for that email address, the account
joins that application automatically on sign-up.

### Being invited

In **Paramètres** (Settings), "Utilisateurs" (Users) card, **Inviter**
(Invite) button ("Manage" collaborators right):

1. Enter the person's email address.
2. Pick the role: **Member** or **Admin** (inviting an admin is reserved to
   admins).
3. Tick their rights, including at least tables "View".
4. **Envoyer une invitation** (Send an invitation).

The invitation shows in the list with the status **Invité** (Invited). Then:

- **the person has no account yet**: they sign up with that address and join
  the application. An admin can also click **Confirmer** (Confirm): the
  account is then created and activated, and a **temporary password** is
  shown, to pass on to the person;
- **the person already has an account**: an admin clicks **Confirmer** to add
  them to the application.

On an "Invité" row, the envelope icon **resends the invitation** and the cross
**cancels it** (admin).

### Adding an existing account

**Ajouter un compte** (Add an account) button: search the account by username
or email, pick the **Member** role and tick its rights, then **Ajouter**
(Add). To make someone an admin, use an invitation (see
[Current limitations](#current-limitations)).

### Statuses in the user list

| Status | Meaning | Possible action (admin) |
| ------ | ------- | ----------------------- |
| **Actif** (Active) | The account is activated and a member of the application. | Change its rights, remove it, delete the account. |
| **En attente** (Pending) | The account exists but its email address is not verified. | **Confirmer**: activates the account as if the person had clicked the link. |
| **Invité** (Invited) | An invitation is waiting for the person. | **Confirmer**, resend or cancel the invitation. |

Your own row carries the **Vous** (You) badge and offers no action: nobody
changes or removes their own account.

---

## Signing in

On the sign-in page, the "Utilisateur" (User) field accepts the **username or
the email address** (the account's confirmed address).

**Mot de passe oublié ?** (Forgot password?) sends a reset link to the
account's address, valid for 1 hour. The link opens a page where the new
password is entered.

The password must be 8 to 32 characters long and contain at least one
uppercase letter, one lowercase letter and one digit, without spaces.

---

## Changing an account

### Your own profile

Account menu (top right) > **Modifier le profil** (Edit profile):

- username, first name, last name and email address;
- the **current password** is required to save these changes;
- the username must stay unique: it changes as soon as it is saved;
- the email address must stay unique (see
  [Current limitations](#current-limitations)).

The **Préférences** (Preferences) card (flow editor navigation mode) is saved
without a password.

To change your password, use **Mot de passe oublié ?** on the sign-in page.

### A member's rights

In **Paramètres**, "Utilisateurs" card, a row's pencil opens **Modifier le
collaborateur** (Edit collaborator): tick or untick their rights, then
**Enregistrer** (Save). The role is shown but cannot be changed.

The pencil does not appear on your own row, nor, for a member who is not
admin, on an admin's row.

---

## Removing a member or deleting an account

Both actions are in **Modifier le collaborateur**.

| Action | Effect | Who |
| ------ | ------ | --- |
| **Retirer de l'application** (Remove from the application) | The account leaves this application. It still exists and keeps its other applications. | "Manage" collaborators right; admin to remove an admin. |
| **Supprimer le compte** (Delete the account) | **Permanent** deletion of the account. To confirm, type its email address. | Admin, with the "Manage" collaborators right. |

Deleting an account is refused:

- while it is still a member of another application: remove it from the
  listed applications first;
- for your own account;
- for a superadmin's account.

---

## Creating and deleting an application

Reserved to superadmins.

- **Create**: **Nouvelle application** (New application) button at the top
  of the screen, or in **Administration**. Enter the name, a description, and
  the email address of the application's admin: they are invited with the
  admin role and every right. The superadmin is not a member of the created
  application; its settings page opens, to confirm the admin's account if
  needed.
- **Delete**: **Administration**, "Applications" tab, bin icon, then type the
  application's exact name. The deletion is permanent and logged.

An application without an active admin runs no decision: **Administration**
flags it with the "Aucun admin" (No admin) badge.

---

## Who can do what

| Action | Who |
| ------ | --- |
| Sign up | Anyone |
| Change your profile | Yourself |
| See an application's members | "Manage" collaborators right |
| Invite a member | "Manage" collaborators right |
| Invite an admin | Admin, with the "Manage" collaborators right |
| Add an existing account | "Manage" collaborators right |
| Confirm an account, resend or cancel an invitation | Admin, with the "Manage" collaborators right |
| Change a member's rights | "Manage" collaborators right, never your own |
| Change an admin's rights | Admin, with the "Manage" collaborators right |
| Remove a member from the application | "Manage" collaborators right, never yourself |
| Remove an admin from the application | Admin, with the "Manage" collaborators right |
| Delete an account | Admin, with the "Manage" collaborators right |
| Create or delete an application | Superadmin |
| Appoint or remove a superadmin | Claims IA, on the server |

In every case, nobody gives more rights than they hold.

---

## Current limitations

Known points, awaiting a fix:

- **Email change**: on a server where accounts are activated without
  verification, it is immediate. Otherwise the new address waits for a
  confirmation, but no confirmation email is sent: the old address stays the
  account's.
- **Password**: it cannot be changed from the profile; use **Mot de passe
  oublié ?**. The temporary password given when an invitation is confirmed
  does not have to be changed, despite what the message says.
- **Admin role**: an existing member cannot be made admin from the interface,
  and **Ajouter un compte** with the Admin role is refused. For a new admin,
  use **Inviter** with the Admin role.
- **Verification email**: it cannot be resent. An admin can activate the
  account with **Confirmer**.
- **Settings page**: a member without the "Manage" collaborators right sees an
  error message on loading and an empty user list.
- **Language**: rights labels, the account activation page and the new
  password page are in English.
