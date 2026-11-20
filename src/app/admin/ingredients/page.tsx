"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, Leaf, Pencil, Plus, Search, X } from "lucide-react";
import {
  createIngredient,
  deactivateIngredient,
  Ingredient,
  IngredientInput,
  listIngredients,
  updateIngredient,
} from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const emptyIngredient: IngredientInput = { name: "", baseUnit: "g", quantityOnHand: 0 };
const emptyIngredients: Ingredient[] = [];

export default function IngredientsPage() {
  const session = useAuthStore((state) => state.session);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [draft, setDraft] = useState<IngredientInput>(emptyIngredient);

  const ingredientsQuery = useQuery({
    queryKey: ["admin", "ingredients"],
    queryFn: () => listIngredients(session!.token),
    enabled: Boolean(session?.token),
  });

  const saveMutation = useMutation({
    mutationFn: (input: IngredientInput) => editing
      ? updateIngredient(session!.token, editing._id, input)
      : createIngredient(session!.token, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "ingredients"] });
      closeForm();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (ingredient: Ingredient) => ingredient.isActive
      ? deactivateIngredient(session!.token, ingredient._id)
      : updateIngredient(session!.token, ingredient._id, {
        name: ingredient.name,
        baseUnit: ingredient.baseUnit,
        quantityOnHand: ingredient.quantityOnHand,
        isActive: true,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "ingredients"] }),
  });

  const ingredients = ingredientsQuery.data ?? emptyIngredients;
  const filteredIngredients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ingredients.filter((ingredient) => ingredient.name.toLowerCase().includes(query));
  }, [ingredients, search]);

  function openCreateForm() {
    setEditing(null);
    setDraft(emptyIngredient);
    saveMutation.reset();
    setIsFormOpen(true);
  }

  function openEditForm(ingredient: Ingredient) {
    setEditing(ingredient);
    setDraft({
      name: ingredient.name,
      baseUnit: ingredient.baseUnit,
      quantityOnHand: ingredient.quantityOnHand ?? 0,
      isActive: ingredient.isActive,
    });
    saveMutation.reset();
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditing(null);
    setDraft(emptyIngredient);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate(draft);
  }

  function toggleActive(ingredient: Ingredient) {
    if (ingredient.isActive && !window.confirm(`Deactivate ${ingredient.name}?`)) return;
    deactivateMutation.mutate(ingredient);
  }

  return (
    <div className="admin-content">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">PANTRY INVENTORY</p>
          <h1>Ingredients</h1>
          <p className="admin-subtitle">Track what is on hand. Orders deduct quantities from this pantry.</p>
        </div>
        <button className="primary-action" onClick={openCreateForm} type="button">
          <Plus size={17} />
          <span>Add ingredient</span>
        </button>
      </div>

      <section className="catalog-toolbar" aria-label="Ingredient filters">
        <label className="catalog-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search ingredients</span>
          <input onChange={(event) => setSearch(event.target.value)} placeholder="Search ingredients" value={search} />
        </label>
        <span className="catalog-count">{ingredients.length} {ingredients.length === 1 ? "ingredient" : "ingredients"}</span>
      </section>

      {(ingredientsQuery.isError || deactivateMutation.isError) && (
        <p className="admin-alert" role="alert"><CircleAlert size={16} />
          {ingredientsQuery.error?.message ?? deactivateMutation.error?.message}
        </p>
      )}

      {ingredientsQuery.isPending ? (
        <div className="catalog-state">Loading ingredients...</div>
      ) : filteredIngredients.length === 0 ? (
        <div className="catalog-empty">
          <span className="empty-mark"><Leaf size={22} /></span>
          <h2>{search ? "No matching ingredients" : "Your pantry starts here"}</h2>
          <p>{search ? "Try a different search." : "Add ingredients before building your recipes."}</p>
          {!search && <button className="text-action" onClick={openCreateForm} type="button">Add your first ingredient</button>}
        </div>
      ) : (
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr><th>INGREDIENT</th><th>ON HAND</th><th>BASE UNIT</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {filteredIngredients.map((ingredient) => (
                <tr key={ingredient._id}>
                  <td><span className="ingredient-name"><Leaf size={16} />{ingredient.name}</span></td>
                  <td><span className="ingredient-stock-value">{ingredient.quantityOnHand ?? 0}</span></td>
                  <td><span className="unit-label">{ingredient.baseUnit}</span></td>
                  <td><span className={ingredient.isActive ? "status-label status-active" : "status-label status-inactive"}>{ingredient.isActive ? "Active" : "Inactive"}</span></td>
                  <td>
                    <div className="row-actions">
                      <button aria-label={`Edit ${ingredient.name}`} className="icon-action" onClick={() => openEditForm(ingredient)} title="Edit ingredient" type="button"><Pencil size={16} /></button>
                      <button
                        aria-label={ingredient.isActive ? `Deactivate ${ingredient.name}` : `Reactivate ${ingredient.name}`}
                        className="icon-action"
                        disabled={deactivateMutation.isPending}
                        onClick={() => toggleActive(ingredient)}
                        title={ingredient.isActive ? "Deactivate ingredient" : "Reactivate ingredient"}
                        type="button"
                      >
                        {ingredient.isActive ? <X size={17} /> : <CircleCheck size={17} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isFormOpen && (
        <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <section aria-labelledby="ingredient-form-title" aria-modal="true" className="admin-modal" role="dialog">
            <header className="modal-heading">
              <div><p className="admin-eyebrow">PANTRY INVENTORY</p><h2 id="ingredient-form-title">{editing ? "Edit ingredient" : "New ingredient"}</h2></div>
              <button aria-label="Close" className="icon-action" onClick={closeForm} type="button"><X size={18} /></button>
            </header>
            <form className="admin-form" onSubmit={handleSubmit}>
              <label htmlFor="ingredient-name">Name</label>
              <input autoFocus id="ingredient-name" maxLength={100} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required value={draft.name} />
              <label htmlFor="ingredient-quantity">Quantity on hand</label>
              <input
                id="ingredient-quantity"
                min="0"
                onChange={(event) => setDraft({ ...draft, quantityOnHand: Number(event.target.value) })}
                required
                step="any"
                type="number"
                value={draft.quantityOnHand}
              />
              <label htmlFor="ingredient-unit">Base unit</label>
              <select id="ingredient-unit" onChange={(event) => setDraft({ ...draft, baseUnit: event.target.value as IngredientInput["baseUnit"] })} value={draft.baseUnit}>
                <option value="g">Grams (g)</option>
                <option value="ml">Milliliters (ml)</option>
                <option value="each">Each</option>
              </select>
              <p className="form-hint">Orders deduct recipe amounts from this quantity. All amounts use the base unit.</p>
              {saveMutation.isError && <p className="admin-alert" role="alert"><CircleAlert size={16} />{saveMutation.error.message}</p>}
              <div className="modal-actions">
                <button className="secondary-action" onClick={closeForm} type="button">Cancel</button>
                <button className="primary-action" disabled={saveMutation.isPending} type="submit">{saveMutation.isPending ? "Saving..." : editing ? "Save changes" : "Create ingredient"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}