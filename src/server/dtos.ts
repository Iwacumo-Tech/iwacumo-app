import { z } from "zod";

export const createUserSchema = z.object({
  id: z.string().optional(),
  email: z.string().optional(),
  first_name: z.string().optional(),
  phone_number: z.string().optional(),
  last_name: z.string().optional(),
  roleName: z.string().optional(),
  date_of_birth: z.date().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  author_id: z.string().optional(),
  publisher_id: z.string().optional(),
  name: z.string().optional(),
  custom_domain: z.string().optional(),
  website: z.string().optional(),
  author_name: z.string().optional(),

});

export const createRoleSchema = z.object({
  name: z.string(),
  active: z.boolean().default(true),
  built_in: z.boolean().default(false),
  permissionIds: z.array(z.string()).optional(),
});

export const assignRoleSchema = z.object({
  user_id: z.string(),
  role_name: z.string(),
});

export const createPublisherSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  username: z.string ().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone_number: z.string().optional(),
  date_of_birth: z.date().optional(),
  org_name: z.string().optional(),
  org_slug: z.string().optional(),
  slug: z.string().optional(),
  contact_email: z.string().optional(),

});

export const createAuthorSchema = z .object({
  id: z.string().optional(),
  custom_domain: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  username: z.string ().optional(),
  first_name: z.string().optional(),
  publisher_id: z.string().optional(),
  last_name: z.string().optional(),
  phone_number: z.string().optional(),
  date_of_birth: z.date().optional(),
});

export const imageUploadSchema = z.object({ file: z.instanceof(File).optional() });

export const signUpAuthorSchema = z .object({
  email: z.string().optional(),
  password: z.string().optional(),
  first_name: z.string().optional(),
  slug: z.string().optional(),
  publisher_id: z.string().optional(),
  last_name: z.string().optional(),
  phone_number: z.string().optional(),
});

export const createBookSchema = z .object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  book_cover: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  published: z.boolean().optional()
    .default(false),
  pdf_url: z.string().url()
    .optional(),
  text_url: z.string().url()
    .optional(),
  publisher_id: z.string().optional(),
  author_id: z.string().optional(),

});

export const createTenantSchema = z.object({
  id: z.string().optional(),
  first_name: z.string().optional(),
  email: z.string().optional(),
  phone_number: z.string().optional(),
  last_name: z.string().optional(),
  password: z.string().optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
  contact_email: z.string().optional(),

});

export const createChapterSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  content: z.string(),
  chapter_number: z.number().optional(),
  summary: z.string().optional(),
  word_count: z.coerce.number().optional(),
  book_id: z.string().optional(),
});

export const findChapterByIdSchema = z.object({
  id: z.string().optional(),
  book_id: z.string(),
});

export const editProfileSchema = z .object({
  id: z.string().optional(),
  profilePicture: z.string().optional(),
  bio: z.string().optional(),

});

export const findBookByIdSchema = z.object({ id: z.string() });

export const  deleteChapterSchema = z.object ({ id: z.string () });

export type TFindChapterByIdSchema = z.infer<typeof findChapterByIdSchema>;

export type TCreateChapterSchema = z.infer<typeof createChapterSchema>;

export type TCreateTenentSchema =  z.infer<typeof createTenantSchema>;

export const createCustomerSchema = z.object({
  id: z.string().optional(),
  purchased_books: z.array(z.string()).optional(),
  author_id: z.string().optional(),
  publisher_id: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  username: z.string ().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone_number: z.string().optional(),
  date_of_birth: z.date().optional(),

});

export type  TCreateCustomerSchema = z.infer<typeof createCustomerSchema>;

export const deleteCustomerSchema = z.object({ id: z.string() });

export const deleteBookSchema = z.object({ id: z.string() });

export const deleteTenantSchema = z.object({ id: z.string() });

export type  TCreateBookSchema = z.infer<typeof createBookSchema>;

export type  TEditProfileSchema = z.infer<typeof editProfileSchema>;

export const deleteAuthorSchema = z.object({ id: z.string() });

export type  TCreateAuthorSchema = z.infer<typeof createAuthorSchema>;

export type TCreatePublisherSchema = z.infer<typeof createPublisherSchema>;

export type TSignUpAuthorSchema = z.infer<typeof signUpAuthorSchema>;

export const deletePublisherSchema = z.object({ id: z.string() });

export const deleteUserSchema = z.object({ id: z.string() });

export type TCreateUserSchema = z.infer<typeof createUserSchema>;

export type TAssignRoleSchema = z.infer<typeof assignRoleSchema>;
