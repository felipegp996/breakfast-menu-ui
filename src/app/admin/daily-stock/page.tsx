"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CircleAlert, Search, Wheat } from "lucide-react";
import { DailyStockRecipe, getDailyStock } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const emptyRecipes: DailyStockRecipe[] = [];

export default function DailyStockPage() {
  const session = useAuthStore((state) => state.session);
  const [serviceDate, setServiceDate] = useState("");
  const [search, setSearch] = useState("");

  const stockQuery = useQuery({
    queryKey: ["admin", "daily-stock", serviceDate || "today"],
    queryFn: () => getDailyStock(session!.token, serviceDate || undefined),
    enabled: Boolean(session?.token),
  });

  const recipes = stockQuery.data?.recipes ?? emptyRecipes;
  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return recipes.filter((recipe) =>
      recipe.name.toLowerCase().includes(query) ||
      recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(query)),
    );
  }, [recipes, search]);

  const availableCount = recipes.filter((recipe) => recipe.isAvailable).length;
  const unavailableCount = recipes.length - availableCount;

  return (
    <div className="admin-content">
      <div className="admin-page-heading stock-page-heading">
        <div>
          <p className="admin-eyebrow">MENU AVAILABILITY</p>
          <h1>Daily stock</h1>
          <p className="admin-subtitle">Recipes appear here when the pantry has every required ingredient.</p>
        </div>
        <label className="stock-date-picker">
          <CalendarDays size={16} aria-hidden="true" />
          <span className="sr-only">Service date</span>
          <input
            aria-label="Service date"
            onChange={(event) => setServiceDate(event.target.value)}
            type="date"
            value={serviceDate || stockQuery.data?.serviceDate || ""}
          />
        </label>
      </div>

      {stockQuery.data && (
        <section className="stock-overview" aria-label="Recipe availability summary">
          <div className="stock-summary-item"><span>AVAILABLE</span><strong>{availableCount}</strong></div>
          <div className="stock-summary-item"><span>NEEDS INGREDIENTS</span><strong>{unavailableCount}</strong></div>
          <div className="stock-summary-item"><span>TOTAL RECIPES</span><strong>{recipes.length}</strong></div>
          <div className="stock-date-label">{formatServiceDate(stockQuery.data.serviceDate)}</div>
        </section>
      )}

      <section className="catalog-toolbar stock-toolbar" aria-label="Availability filters">
        <label className="catalog-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search recipes or ingredients</span>
          <input onChange={(event) => setSearch(event.target.value)} placeholder="Search recipes or ingredients" value={search} />
        </label>
        <span className="catalog-count">Calculated from current pantry quantities</span>
      </section>

      {stockQuery.isError && <p className="admin-alert" role="alert"><CircleAlert size={16} />{stockQuery.error.message}</p>}

      {stockQuery.isPending ? (
        <div className="catalog-state">Checking today&apos;s recipes...</div>
      ) : recipes.length === 0 ? (
        <div className="catalog-empty">
          <span className="empty-mark"><Wheat size={22} /></span>
          <h2>No recipes to check</h2>
          <p>Add recipes and their ingredient requirements to see daily availability.</p>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="catalog-state">No recipes or ingredients match that search.</div>
      ) : (
        <div className="stock-recipe-list">
          {filteredRecipes.map((recipe) => (
            <article className={recipe.isAvailable ? "stock-recipe-row available" : "stock-recipe-row unavailable"} key={recipe.id}>
              <div
                aria-label={`${recipe.name} photo`}
                className="stock-recipe-image"
                role="img"
                style={{ backgroundImage: `url("${recipe.imageUrl}")` }}
              />
              <div className="stock-recipe-details">
                <div className="stock-recipe-heading">
                  <div>
                    <span className={recipe.isAvailable ? "stock-status available" : "stock-status unavailable"}>
                      {recipe.isAvailable ? "On today’s menu" : "Needs ingredients"}
                    </span>
                    <h2>{recipe.name}</h2>
                  </div>
                  <span className="stock-recipe-count">{recipe.ingredients.length} {recipe.ingredients.length === 1 ? "ingredient" : "ingredients"}</span>
                </div>
                <p className="stock-recipe-description">{recipe.description}</p>
                <ul className="stock-requirements" aria-label={`${recipe.name} ingredient availability`}>
                  {recipe.ingredients.map((ingredient) => (
                    <li className={ingredient.isSufficient ? "sufficient" : "insufficient"} key={ingredient.ingredientId}>
                      <span>{ingredient.name}</span>
                      <span className="stock-requirement-amounts">
                        Need {ingredient.requiredQuantity} {ingredient.unit}
                        <span>Have {ingredient.availableQuantity} {ingredient.unit}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function formatServiceDate(serviceDate: string) {
  return new Date(`${serviceDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}