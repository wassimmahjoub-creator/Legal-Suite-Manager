# MIGRATION_NOTES — Audit `<Button />` (محامي بلوس)

## Contexte

Le projet utilise déjà **shadcn/ui `<Button />`** (`@/components/ui/button`).
Ce composant est la source de vérité unique — **ne pas créer un second Button**.

Mapping de la spec vers shadcn :

| Spec       | shadcn `variant` | Usage                                      |
|------------|------------------|--------------------------------------------|
| primary    | `default`        | Action principale (حفظ، إضافة، تأكيد)       |
| secondary  | `outline`        | Action secondaire (تعديل، تصدير، رجوع)      |
| destructive| `destructive`    | Suppression irréversible (حذف نهائي)        |
| ghost      | `ghost`          | Bouton icône, nav inline, lien             |

Page démo disponible en dev : **`/dev/components`**

---

## VIOLATIONS RÉSOLUES ✅

| Fichier                  | Ligne | Problème                                             | Fix appliqué                    |
|--------------------------|-------|------------------------------------------------------|---------------------------------|
| `pages/AuditLogs.tsx`    | 74    | `<button className="bg-primary ...">تصفية</button>` | → `<Button size="sm">تصفية</Button>` |

---

## VIOLATIONS À ARBITRER (plusieurs `default` sur un même écran)

> Règle : **une seule action `default` par écran**.  
> Les cas ci-dessous ont plusieurs boutons visuellement primaires simultanément — trancher au cas par cas.

### 1. `pages/Cases.tsx`
- **Bouton "قضية جديدة"** (primary) + bouton "عرض" (Eye icon, inline table) → OK, seul vrai primaire visible, Eye peut rester ghost.
- **Décision recommandée** : aucun changement nécessaire.

### 2. `pages/Billing.tsx`
- **"فاتورة جديدة"** (primary) + dans table **"سحب / إلغاء"** buttons → secondary context.
- **Décision recommandée** : laisser tel quel, actions de table sont secondaires.

### 3. `pages/Templates.tsx`
- Barre d'actions par template : **preview + copy + download + edit** — 4 boutons icônes de même rang.
- Actuellement `<button className="p-2 bg-primary/10 text-primary">` pour preview = quasi-primary manuel.
- **Décision à prendre** : convertir preview en `<Button variant="outline" size="sm">` ou garder le style custom ?

### 4. `pages/Communications.tsx`
- Filtres par type (tab-like) : `<button className="... bg-primary text-primary-foreground">` quand actif.
- Ce sont des **toggles de filtre**, pas des actions — ne pas convertir en `<Button>`.
- **Décision recommandée** : extraire dans un composant `<FilterTab>` ou utiliser `<Tabs>` shadcn.

### 5. `pages/LegalConfig.tsx`
- Même pattern que Communications — filtres catégorie en style primary quand sélectionné.
- **Décision recommandée** : idem `<FilterTab>` ou `<Tabs>` shadcn.

### 6. `pages/Subscription.tsx` + `pages/Pricing.tsx`
- Toggles mensuel/annuel : `<button>` stylés comme selected/unselected.
- **Décision recommandée** : convertir en composant toggle dédié, pas `<Button>`.

### 7. `pages/Settings.tsx` (lignes 306–309)
- Deux `<button>` de sélection de thème (actif/inactif) — comportement toggle.
- **Décision recommandée** : composant toggle, pas `<Button>`.

---

## BOUTONS INTENTIONNELLEMENT LAISSÉS en `<button>` brut

Ces éléments sont des patterns UI spéciaux qui ne doivent **pas** être convertis en `<Button>` :

| Catégorie                         | Exemples                                                  | Raison                                  |
|-----------------------------------|-----------------------------------------------------------|-----------------------------------------|
| **Navigation retour**             | `window.history.back()` dans CaseDetail, Reports…        | Layout spécifique, pas une action CRUD  |
| **Items de nav sidebar**          | `Layout.tsx` — NavItem, QuickActions, UserMenu           | Composants UI de navigation propres     |
| **Résultats de recherche**        | `GlobalSearch.tsx` — boutons de résultat                 | Contexte modal, style dédié             |
| **Fermeture de modal**            | `Modal.tsx` — bouton ×                                   | Icône pure, pas d'action métier         |
| **Boutons icônes inline (CRUD)**  | Pencil/Trash dans lignes de tableau                      | Candidats à `<Button size="icon" variant="ghost">` — voir ci-dessous |
| **Dictée vocale**                 | `VoiceDictation.tsx`, `MicButton.tsx`                    | UI spécialisée, style propre            |
| **CourtSelect autocomplete**      | `CourtSelect.tsx`                                        | Composant select custom                 |

---

## PROCHAINE MIGRATION OPTIONNELLE — Boutons icônes CRUD

~25 occurrences du pattern :

```tsx
// Avant
<button onClick={...} className="p-1.5 hover:bg-muted rounded-lg">
  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
</button>
<button onClick={...} className="p-1.5 hover:bg-destructive/10 rounded-lg">
  <Trash2 className="h-3.5 w-3.5 text-destructive" />
</button>

// Après (candidat)
<Button variant="ghost" size="icon" onClick={...} className="h-7 w-7 text-muted-foreground">
  <Pencil className="h-3.5 w-3.5" />
</Button>
<Button variant="ghost" size="icon" onClick={...} className="h-7 w-7 hover:text-destructive text-muted-foreground">
  <Trash2 className="h-3.5 w-3.5" />
</Button>
```

**Fichiers concernés** : BankAccounts, Calendar, ClientPage, Clients, Communications,
Consultations, Correspondances, Courts, CaseDetail, InsuranceCompanies, LegalConfig, Opponents.

**À décider** : vaut-il le risque visuel pour gagner en cohérence sémantique ?

---

*Généré le 2026-05-17 — محامي بلوس audit Button*
