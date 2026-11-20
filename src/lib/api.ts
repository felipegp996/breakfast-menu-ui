export type UserRole = "admin" | "user";

export interface AuthSession {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

const apiBaseUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";

export type IngredientUnit = "g" | "ml" | "each";

export interface Ingredient {
  _id: string;
  name: string;
  baseUnit: IngredientUnit;
  quantityOnHand: number;
  isActive: boolean;
}

export interface IngredientInput {
  name: string;
  baseUnit: IngredientUnit;
  quantityOnHand: number;
  isActive?: boolean;
}

export interface DailyStockRecipeIngredient {
  ingredientId: string;
  name: string;
  unit: IngredientUnit;
  requiredQuantity: number;
  availableQuantity: number;
  isSufficient: boolean;
}

export interface DailyStockRecipe {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  isAvailable: boolean;
  ingredients: DailyStockRecipeIngredient[];
}

export interface DailyStockDay {
  serviceDate: string;
  recipes: DailyStockRecipe[];
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
}

export interface Recipe {
  _id: string;
  name: string;
  description: string;
  imageUrl: string;
  ingredients: RecipeIngredient[];
  isActive: boolean;
}

export interface RecipeInput {
  name: string;
  description: string;
  imageUrl: string;
  ingredients: RecipeIngredient[];
  isActive?: boolean;
}

export interface MenuRecipeIngredient {
  ingredientId: string;
  name: string;
  unit: IngredientUnit;
  quantity: number;
}

export interface MenuRecipe {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  ingredients: MenuRecipeIngredient[];
}

export interface MenuToday {
  serviceDate: string;
  recipes: MenuRecipe[];
  currentRequest: {
    recipeId: string;
    status: "active";
    recipeSnapshot: {
      name: string;
      description: string;
      imageUrl: string;
      ingredients: MenuRecipeIngredient[];
    };
  } | null;
}

export interface BreakfastRequestResult {
  serviceDate: string;
  recipeId: string;
  status: "active" | "cancelled" | "completed";
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "The request could not be completed.");
  }

  return payload as T;
}

export function login(credentials: { email: string; password: string }): Promise<AuthSession> {
  return request<AuthSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function listIngredients(token: string, includeInactive = true): Promise<Ingredient[]> {
  return request(`/api/admin/ingredients?includeInactive=${includeInactive}`, {}, token);
}

export function createIngredient(token: string, input: IngredientInput): Promise<Ingredient> {
  return request("/api/admin/ingredients", { method: "POST", body: JSON.stringify(input) }, token);
}

export function updateIngredient(token: string, id: string, input: IngredientInput): Promise<Ingredient> {
  return request(`/api/admin/ingredients/${id}`, { method: "PUT", body: JSON.stringify(input) }, token);
}

export function deactivateIngredient(token: string, id: string): Promise<Ingredient> {
  return request(`/api/admin/ingredients/${id}`, { method: "DELETE" }, token);
}

export function getDailyStock(token: string, serviceDate?: string): Promise<DailyStockDay> {
  const query = serviceDate ? `?date=${encodeURIComponent(serviceDate)}` : "";
  return request(`/api/admin/daily-stock${query}`, {}, token);
}

export function listRecipes(token: string, includeInactive = true): Promise<Recipe[]> {
  return request(`/api/admin/recipes?includeInactive=${includeInactive}`, {}, token);
}

export function createRecipe(token: string, input: RecipeInput): Promise<Recipe> {
  return request("/api/admin/recipes", { method: "POST", body: JSON.stringify(input) }, token);
}

export function updateRecipe(token: string, id: string, input: RecipeInput): Promise<Recipe> {
  return request(`/api/admin/recipes/${id}`, { method: "PUT", body: JSON.stringify(input) }, token);
}

export function deactivateRecipe(token: string, id: string): Promise<Recipe> {
  return request(`/api/admin/recipes/${id}`, { method: "DELETE" }, token);
}

export function getTodayMenu(token: string): Promise<MenuToday> {
  return request("/api/menu/today", {}, token);
}

export function placeBreakfastRequest(token: string, recipeId: string): Promise<BreakfastRequestResult> {
  return request("/api/requests", {
    method: "POST",
    body: JSON.stringify({ recipeId }),
  }, token);
}

export function cancelBreakfastRequest(token: string): Promise<BreakfastRequestResult> {
  return request("/api/requests/today", { method: "DELETE" }, token);
}