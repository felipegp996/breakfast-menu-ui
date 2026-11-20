"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CircleAlert, CircleCheck, ImagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  createRecipe,
  deactivateRecipe,
  Ingredient,
  listIngredients,
  listRecipes,
  Recipe,
  RecipeInput,
  updateRecipe,
} from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const emptyRecipe: RecipeInput = { name: "", description: "", imageUrl: "", ingredients: [] };
const emptyRecipes: Recipe[] = [];
const emptyIngredients: Ingredient[] = [];

export default function RecipesPage() {
  const session = useAuthStore((state) => state.session);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [draft, setDraft] = useState<RecipeInput>(emptyRecipe);

  const recipesQuery = useQuery({
    queryKey: ["admin", "recipes"],
    queryFn: () => listRecipes(session!.token),
    enabled: Boolean(session?.token),
  });
  const ingredientsQuery = useQuery({
    queryKey: ["admin", "ingredients"],
    queryFn: () => listIngredients(session!.token),
    enabled: Boolean(session?.token),
  });

  const saveMutation = useMutation({
    mutationFn: (input: RecipeInput) => editing
      ? updateRecipe(session!.token, editing._id, input)
      : createRecipe(session!.token, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "recipes"] });
      closeForm();
    },
  });
  const statusMutation = useMutation({
    mutationFn: (recipe: Recipe) => recipe.isActive
      ? deactivateRecipe(session!.token, recipe._id)
      : updateRecipe(session!.token, recipe._id, {
        name: recipe.name,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        ingredients: recipe.ingredients,
        isActive: true,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "recipes"] }),
  });

  const recipes = recipesQuery.data ?? emptyRecipes;
  const ingredients = ingredientsQuery.data ?? emptyIngredients;
  const ingredientById = useMemo(() => new Map(ingredients.map((ingredient) => [ingredient._id, ingredient])), [ingredients]);
  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return recipes.filter((recipe) => recipe.name.toLowerCase().includes(query));
  }, [recipes, search]);

  function openCreateForm() {
    setEditing(null);
    setDraft(emptyRecipe);
    saveMutation.reset();
    setIsFormOpen(true);
  }

  function openEditForm(recipe: Recipe) {
    setEditing(recipe);
    setDraft({
      name: recipe.name,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      ingredients: recipe.ingredients.map(({ ingredientId, quantity }) => ({ ingredientId, quantity })),
      isActive: recipe.isActive,
    });
    saveMutation.reset();
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditing(null);
    setDraft(emptyRecipe);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate(draft);
  }

  function toggleActive(recipe: Recipe) {
    if (recipe.isActive && !window.confirm(`Deactivate ${recipe.name}?`)) return;
    statusMutation.mutate(recipe);
  }

  function updateRequirement(index: number, patch: Partial<RecipeInput["ingredients"][number]>) {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((requirement, itemIndex) =>
        itemIndex === index ? { ...requirement, ...patch } : requirement,
      ),
    }));
  }

  const activeIngredients = ingredients.filter((ingredient) => ingredient.isActive);
  const queryError = recipesQuery.error ?? ingredientsQuery.error;

  return (
    <div className="admin-content">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">THE BREAKFAST MENU</p>
          <h1>Recipes</h1>
          <p className="admin-subtitle">Build recipes from your pantry and keep the menu current.</p>
        </div>
        <button className="primary-action" onClick={openCreateForm} type="button">
          <Plus size={17} />
          <span>Add recipe</span>
        </button>
      </div>

      <section className="catalog-toolbar" aria-label="Recipe filters">
        <label className="catalog-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search recipes</span>
          <input onChange={(event) => setSearch(event.target.value)} placeholder="Search recipes" value={search} />
        </label>
        <span className="catalog-count">{recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}</span>
      </section>

      {(queryError || statusMutation.isError) && (
        <p className="admin-alert" role="alert"><CircleAlert size={16} />{queryError?.message ?? statusMutation.error?.message ?? "The action could not be completed."}</p>
      )}

      {recipesQuery.isPending || ingredientsQuery.isPending ? (
        <div className="catalog-state">Loading recipes...</div>
      ) : filteredRecipes.length === 0 ? (
        <div className="catalog-empty">
          <span className="empty-mark"><BookOpen size={22} /></span>
          <h2>{search ? "No matching recipes" : "The menu is waiting"}</h2>
          <p>{search ? "Try a different search." : activeIngredients.length ? "Add your first recipe to the breakfast menu." : "Add active ingredients before creating a recipe."}</p>
          {!search && activeIngredients.length > 0 && <button className="text-action" onClick={openCreateForm} type="button">Create your first recipe</button>}
        </div>
      ) : (
        <div className="recipe-list">
          {filteredRecipes.map((recipe) => (
            <article className="recipe-row" key={recipe._id}>
              <div
                aria-label={`${recipe.name} photo`}
                className="recipe-image"
                role="img"
                style={{ backgroundImage: `url("${recipe.imageUrl}")` }}
              />
              <div className="recipe-details">
                <div className="recipe-title-line">
                  <h2>{recipe.name}</h2>
                  <span className={recipe.isActive ? "status-label status-active" : "status-label status-inactive"}>{recipe.isActive ? "Active" : "Inactive"}</span>
                </div>
                <p className="recipe-description">{recipe.description}</p>
                <ul className="recipe-ingredient-list" aria-label="Recipe ingredients">
                  {recipe.ingredients.map((requirement) => {
                    const ingredient = ingredientById.get(requirement.ingredientId);
                    return (
                      <li key={requirement.ingredientId}>
                        {ingredient?.name ?? "Unavailable ingredient"}
                        <span>{requirement.quantity} {ingredient?.baseUnit ?? ""}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="row-actions recipe-actions">
                <button aria-label={`Edit ${recipe.name}`} className="icon-action" onClick={() => openEditForm(recipe)} title="Edit recipe" type="button"><Pencil size={16} /></button>
                <button
                  aria-label={recipe.isActive ? `Deactivate ${recipe.name}` : `Reactivate ${recipe.name}`}
                  className="icon-action"
                  disabled={statusMutation.isPending}
                  onClick={() => toggleActive(recipe)}
                  title={recipe.isActive ? "Deactivate recipe" : "Reactivate recipe"}
                  type="button"
                >
                  {recipe.isActive ? <Trash2 size={16} /> : <CircleCheck size={17} />}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {isFormOpen && (
        <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <section aria-labelledby="recipe-form-title" aria-modal="true" className="admin-modal recipe-modal" role="dialog">
            <header className="modal-heading">
              <div><p className="admin-eyebrow">THE BREAKFAST MENU</p><h2 id="recipe-form-title">{editing ? "Edit recipe" : "New recipe"}</h2></div>
              <button aria-label="Close" className="icon-action" onClick={closeForm} type="button"><X size={18} /></button>
            </header>
            <form className="admin-form" onSubmit={handleSubmit}>
              <label htmlFor="recipe-name">Recipe name</label>
              <input autoFocus id="recipe-name" maxLength={120} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required value={draft.name} />
              <label htmlFor="recipe-description">Description</label>
              <textarea id="recipe-description" maxLength={1000} onChange={(event) => setDraft({ ...draft, description: event.target.value })} required rows={3} value={draft.description} />
              <label htmlFor="recipe-image">Image URL</label>
              <div className="url-field"><ImagePlus size={17} /><input id="recipe-image" onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} placeholder="https://..." required type="url" value={draft.imageUrl} /></div>

              <div className="form-section-heading"><div><label>Ingredients</label><span>Quantities use each ingredient’s base unit.</span></div>
                <button
                  aria-label="Add ingredient to recipe"
                  className="icon-action"
                  disabled={activeIngredients.length === 0}
                  onClick={() => setDraft((current) => ({ ...current, ingredients: [...current.ingredients, { ingredientId: activeIngredients[0]._id, quantity: 1 }] }))}
                  title="Add ingredient"
                  type="button"
                ><Plus size={17} /></button>
              </div>
              {draft.ingredients.length === 0 ? <p className="form-hint">Add at least one active ingredient.</p> : (
                <div className="requirement-list">
                  {draft.ingredients.map((requirement, index) => {
                    const selectedIngredient = ingredients.find((ingredient) => ingredient._id === requirement.ingredientId);
                    const options = ingredients.filter((ingredient) => ingredient.isActive || ingredient._id === requirement.ingredientId);
                    return (
                      <div className="requirement-row" key={`${requirement.ingredientId}-${index}`}>
                        <select aria-label={`Ingredient ${index + 1}`} onChange={(event) => updateRequirement(index, { ingredientId: event.target.value })} required value={requirement.ingredientId}>
                          {options.map((ingredient) => <option key={ingredient._id} value={ingredient._id}>{ingredient.name}{ingredient.isActive ? "" : " (inactive)"}</option>)}
                        </select>
                        <label className="quantity-field"><span className="sr-only">Quantity</span><input aria-label="Quantity" min="0.001" onChange={(event) => updateRequirement(index, { quantity: Number(event.target.value) })} required step="any" type="number" value={requirement.quantity} /><span>{selectedIngredient?.baseUnit ?? "unit"}</span></label>
                        <button aria-label="Remove ingredient" className="icon-action" onClick={() => setDraft((current) => ({ ...current, ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index) }))} title="Remove ingredient" type="button"><X size={16} /></button>
                      </div>
                    );
                  })}
                </div>
              )}

              {saveMutation.isError && <p className="admin-alert" role="alert"><CircleAlert size={16} />{saveMutation.error.message}</p>}
              <div className="modal-actions">
                <button className="secondary-action" onClick={closeForm} type="button">Cancel</button>
                <button className="primary-action" disabled={saveMutation.isPending || draft.ingredients.length === 0} type="submit">{saveMutation.isPending ? "Saving..." : editing ? "Save changes" : "Create recipe"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}