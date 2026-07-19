// Catégorie : label d'affichage (nom + couleur hex) propre à une application,
// servant à regrouper/classer les tables et les flows. Purement organisationnel.
// Correspond au contrat renvoyé par GET/PUT /api/v1/admin/categories.
export interface Category {
  id: string
  name: string
  // Couleur d'affichage du badge, au format hex '#RRGGBB'.
  color: string
}
