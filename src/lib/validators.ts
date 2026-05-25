import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Имя должно содержать минимум 2 символа")
    .max(100, "Имя слишком длинное"),
  email: z.string().email("Введите корректный email"),
  password: z
    .string()
    .min(6, "Пароль должен содержать минимум 6 символов")
    .max(100, "Пароль слишком длинный"),
});

export const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const venueSchema = z.object({
  name: z
    .string()
    .min(2, "Название должно содержать минимум 2 символа")
    .max(100, "Название слишком длинное"),
  slug: z
    .string()
    .min(2, "Slug должен содержать минимум 2 символа")
    .max(50, "Slug слишком длинный")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug может содержать только латинские буквы, цифры и дефис"
    ),
  description: z.string().max(1000, "Описание слишком длинное").optional(),
  address: z.string().max(200, "Адрес слишком длинный").optional(),
  logoUrl: z.string().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Некорректный цвет").optional(),
  yookassaShopId: z.string().max(50).optional(),
  yookassaSecretKey: z.string().max(200).optional(),
});

export type VenueInput = z.infer<typeof venueSchema>;

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Название обязательно")
    .max(100, "Название слишком длинное"),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const reorderSchema = z.object({
  ids: z.array(z.string()),
});

export const menuItemSchema = z.object({
  name: z
    .string()
    .min(1, "Название обязательно")
    .max(200, "Название слишком длинное"),
  description: z.string().max(1000).optional(),
  price: z.number().int().min(0, "Цена не может быть отрицательной"),
  categoryId: z.string(),
  imageUrl: z.string().optional(),
  isStopped: z.boolean().optional(),
  // Nutrition (КБЖУ)
  calories: z.number().int().min(0).nullable().optional(),
  proteins: z.number().min(0).nullable().optional(),
  fats: z.number().min(0).nullable().optional(),
  carbs: z.number().min(0).nullable().optional(),
  // Composition / ingredients
  composition: z.string().max(2000).nullable().optional(),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().min(1),
        price: z.number().int().min(0),
      })
    )
    .optional(),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;
