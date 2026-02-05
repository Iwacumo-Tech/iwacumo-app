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
  tenant_slug: z.string().optional(),
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

export const createPublisherSchema = z
  .object({
    // User-related fields
    username: z.string(),
    email: z.string().email().optional(),
    password: z.string().min(6, "password must be atleast 6 characters"),
    phone_number: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    date_of_birth: z.date().optional(),

    // Publisher-related fields
    bio: z.string().optional(),
    custom_domain: z.string().optional(),
    profile_picture: z.string().optional(),
    tenant_id: z.string().optional(), // Existing tenant
    tenant_name: z.string().optional(), // New tenant to create if provided
    slug: z.string(), // Slug for the publisher
  })
  .refine(
    (data) => Boolean(data.tenant_id) || Boolean(data.tenant_name),
    {
      message: "Either tenant_id must be selected or tenant_name provided",
      path: ["tenant_id"],
    }
  )
  .refine(
    (data) => !(data.tenant_id && data.tenant_name),
    {
      message: "Provide only one of tenant_id or tenant_name",
      path: ["tenant_name"],
    }
  );

export const updatePublisherSchema = z.object({
  id: z.string(),
  bio: z.string().nullable().optional(),
  custom_domain: z.string().optional(),
  profile_picture: z.string().optional(),
  tenant_id: z.string(),
  tenant_name: z.string(),
  slug: z.string().nullable().optional(),
});

export const getPublisherByOrgSchema = z.object({
  name: z.string(),
});

export const createAuthorSchema = z.object({
  id: z.string().optional(),
  custom_domain: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  username: z.string().optional(),
  first_name: z.string().optional(),
  publisher_id: z.string().optional(),
  last_name: z.string().optional(),
  phone_number: z.string().optional(),
  date_of_birth: z.date().optional(),
});

export const imageUploadSchema = z.object({ file: z.instanceof(File).optional() });

export const signUpAuthorSchema = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
  first_name: z.string().optional(),
  slug: z.string().optional(),
  publisher_id: z.string().optional(),
  last_name: z.string().optional(),
  phone_number: z.string().optional(),
});

// Schema for book variant
export const bookVariantSchema = z.object({
  id: z.string().optional(),
  format: z.enum(["hardcover", "paperback", "ebook", "audiobook"]),
  isbn13: z.string().optional(),
  language: z.string().default("en"),
  list_price: z.number().positive("List price must be positive"),
  currency: z.string().default("USD"),
  discount_price: z.number().positive("Discount price must be positive").optional(),
  stock_quantity: z.number().int().min(0).default(0),
  sku: z.string().optional(),
  digital_asset_url: z.string().url("Digital asset URL must be valid").optional(),
  weight_grams: z.number().int().positive().optional(),
  dimensions: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    depth: z.number().optional(),
  }).optional(),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export const createBookSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  synopsis: z.string().optional(),
  cover_image_url: z.string().url("Cover image must be a valid URL").optional(),
  genre: z.string().optional(),
  subject_tags: z.array(z.string()).optional(),
  edition: z.string().optional(),
  publication_date: z.date().optional(),
  default_language: z.string().default("en"),
  
  // FIXED: Changed to optional/nullable to prevent global validation triggers
  page_count: z.number().int().optional().nullable(),
  
  reading_age_min: z.number().int().positive().optional(),
  reading_age_max: z.number().int().positive().optional(),
  status: z.enum(["draft", "pending_review", "published", "archived"]).optional().default("draft"),
  
  short_description: z.string().optional(), 
  long_description: z.string().optional(), 
  book_cover: z.string().url("Book cover must be a valid URL").nullable().optional(), 
  book_cover2: z.string().url("Book cover 2 must be a valid URL").nullable().optional(), 
  book_cover3: z.string().url("Book cover 3 must be a valid URL").nullable().optional(), 
  book_cover4: z.string().url("Book cover 4 must be a valid URL").nullable().optional(), 
  
  price: z.number().optional(), 

  // FIXED: Changed to optional/nullable to prevent global validation triggers
  paperback_price: z.number().optional().nullable(),
  hardcover_price: z.number().optional().nullable(),
  ebook_price: z.number().optional().nullable(),

  published: z.boolean().optional().default(false),
  category_ids: z.array(z.string()).optional().default([]),
  tags: z.string().optional(), 
  paper_back: z.boolean().optional().default(false),
  e_copy: z.boolean().optional().default(false),
  hard_cover: z.boolean().optional().default(false),
  
  pdf_url: z.string().url("PDF URL must be valid").nullable().optional(), 
  text_url: z.string().url("Text URL must be valid").nullable().optional(),
  docx_url: z.string().url("DOCX URL must be valid").nullable().optional(),
  reader_url: z.string().url("Reader URL must be valid").nullable().optional(),
  
  publisher_id: z.string().optional(),
  author_id: z.string().optional(),
  primary_author_id: z.string().optional(),
  featured: z.boolean().optional().default(false),
  variants: z.array(bookVariantSchema).min(1, "At least one book variant is required").optional(),
}).superRefine((data, ctx) => {
  // 1. Validate Physical Books (Paperback or Hardcover)
  if (data.paper_back || data.hard_cover) {
    if (!data.page_count || data.page_count <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Page count is required for physical books",
        path: ["page_count"],
      });
    }
  }

  // 2. Validate Paperback Price
  if (data.paper_back) {
    if (!data.paperback_price || data.paperback_price <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paperback price is required",
        path: ["paperback_price"],
      });
    }
  }

  // 3. Validate Hardcover Price
  if (data.hard_cover) {
    if (!data.hardcover_price || data.hardcover_price <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hardcover price is required",
        path: ["hardcover_price"],
      });
    }
  }

  // 4. Validate E-Book Price
  if (data.e_copy) {
    if (!data.ebook_price || data.ebook_price <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "E-book price is required",
        path: ["ebook_price"],
      });
    }
  }
});

export const toggleFeaturedSchema = z.object({
  id: z.string(), 
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
  custom_domain: z.string().optional(),
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

export const editProfileSchema = z.object({
  id: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username/Slug must be at least 3 characters"),
  bio: z.string().optional(),
  phone_number: z.string().optional(),
  organization_name: z.string().optional(), // For Publishers
  profilePicture: z.string().optional(),
});

export const createBannerSchema = z.object({
  image: z.string(), 
});

export const reviewSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, { message: "Rating must be at least 1." })
    .max(5, { message: "Rating must be at most 5." }), 
  comment: z
    .string()
    .min(1, { message: "Comment cannot be empty." }),
  book_id: z.string(),
  user_id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
});

export const CartSchema = z.object({
  book_image: z.string(),
  book_title: z.string(),
  book_type: z.string(), 
  price: z.number().positive(),
  quantity: z.number().int().positive().optional(), 
  total: z.number().positive(), 
  userId: z.string().optional(), 
});

export const findBookByIdSchema = z.object({ id: z.string() });

export const deleteChapterSchema = z.object({ id: z.string() });

export type TcreateBannerSchema = z.infer<typeof createBannerSchema>;
export type TFindChapterByIdSchema = z.infer<typeof findChapterByIdSchema>;
export type TCreateChapterSchema = z.infer<typeof createChapterSchema>;
export type TCreateTenantSchema = z.infer<typeof createTenantSchema>;

export const createCustomerSchema = z.object({
  id: z.string().optional(),
  purchased_books: z.array(z.string()).optional(),
  author_id: z.string().optional(),
  publisher_id: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone_number: z.string().optional(),
  date_of_birth: z.date().optional(),
});

export const heroSlideSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string(),
  buttonText: z.string().min(1, "Button text is required"),
  buttonRoute: z.string().min(1, "Button route is required"),
});

export const bookSlideSchema = z.object({
  title: z.string().min(1, "Title is required"),
  price: z.number(),
  description: z.string().min(1, "Description is required"),
  image: z.string().min(1, "Image is required"),
});

export type TCreateCustomerSchema = z.infer<typeof createCustomerSchema>;
export type TheroSlideSchema = z.infer<typeof heroSlideSchema>;
export type TbookSlideSchema = z.infer<typeof bookSlideSchema>;

export const deleteCustomerSchema = z.object({ id: z.string() });
export const deleteBookSchema = z.object({ id: z.string() });
export const deleteTenantSchema = z.object({ id: z.string() });

export type TCreateBookSchema = z.infer<typeof createBookSchema>;
export type TEditProfileSchema = z.infer<typeof editProfileSchema>;

export const deleteAuthorSchema = z.object({ id: z.string() });
export type TCreateAuthorSchema = z.infer<typeof createAuthorSchema>;
export type TCreatePublisherSchema = z.infer<typeof createPublisherSchema>;
export type TupdatePublisherSchema = z.infer<typeof updatePublisherSchema>;
export type TSignUpAuthorSchema = z.infer<typeof signUpAuthorSchema>;

export const deletePublisherSchema = z.object({ id: z.string() });
export const deleteUserSchema = z.object({ id: z.string() });
export type TCreateUserSchema = z.infer<typeof createUserSchema>;
export type TAssignRoleSchema = z.infer<typeof assignRoleSchema>;

// AdminUser schemas
export const createAdminUserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  tenant_id: z.string(), // Required: AdminUser belongs to a Tenant/Organization
  role_name: z.string().optional(), // Optional: Role to assign when creating
  publisher_id: z.string().optional(), // Optional: Publisher scope for the role
  status: z.enum(["invited", "active", "suspended", "archived"]).default("invited"),
});

export const updateAdminUserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  tenant_id: z.string().optional(),
  status: z.enum(["invited", "active", "suspended", "archived"]).optional(),
});

export const assignRoleToAdminUserSchema = z.object({
  admin_user_id: z.string(),
  tenant_id: z.string(), // Required: AdminUserRole belongs to a Tenant
  role_name: z.string(),
  publisher_id: z.string().optional(), // Optional: scopes role to a specific publisher within the tenant
  expires_at: z.date().optional(), // Optional: role expiration date
});

export const removeRoleFromAdminUserSchema = z.object({
  admin_user_id: z.string(),
  tenant_id: z.string(), // Required: to identify the specific role assignment
  role_name: z.string(),
  publisher_id: z.string().optional(),
});

export const getAdminUserByIdSchema = z.object({
  id: z.string(),
});

export const deleteAdminUserSchema = z.object({
  id: z.string(),
});

export type TCreateAdminUserSchema = z.infer<typeof createAdminUserSchema>;
export type TUpdateAdminUserSchema = z.infer<typeof updateAdminUserSchema>;
export type TAssignRoleToAdminUserSchema = z.infer<typeof assignRoleToAdminUserSchema>;
export type TRemoveRoleFromAdminUserSchema = z.infer<typeof removeRoleFromAdminUserSchema>;
export type TGetAdminUserByIdSchema = z.infer<typeof getAdminUserByIdSchema>;
export type TDeleteAdminUserSchema = z.infer<typeof deleteAdminUserSchema>;

// Delivery address schema
export const deliveryAddressSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone_number: z.string().min(1, "Phone number is required"),
  email: z.string().email("Valid email is required").optional(),
  address_line1: z.string().min(1, "Address is required"),
  address_line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required").default("Nigeria"),
  delivery_instructions: z.string().optional(),
});

// Order schemas
export const createOrderFromCartSchema = z.object({
  user_id: z.string(),
  shipping_address_id: z.string().optional(),
  billing_address_id: z.string().optional(),
  tax_amount: z.number().min(0).default(0),
  shipping_amount: z.number().min(0).default(0),
  discount_amount: z.number().min(0).default(0),
  currency: z.string().default("USD"),
  channel: z.string().optional(),
  notes: z.string().optional(),
  delivery_address: deliveryAddressSchema.optional(), // Delivery info for physical items
  requires_delivery: z.boolean().default(false), // Whether order contains physical items
});

export const getOrderByIdSchema = z.object({
  id: z.string(),
});

export const getOrdersByCustomerSchema = z.object({
  customer_id: z.string(),
});

export const updateOrderStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["draft", "pending", "paid", "fulfilled", "cancelled", "refunded"]).optional(),
  payment_status: z.enum(["pending", "authorized", "captured", "refunded", "failed"]).optional(),
});

export const cancelOrderSchema = z.object({
  id: z.string(),
  reason: z.string().optional(),
});

export type TDeliveryAddressSchema = z.infer<typeof deliveryAddressSchema>;
export type TCreateOrderFromCartSchema = z.infer<typeof createOrderFromCartSchema>;
export type TGetOrderByIdSchema = z.infer<typeof getOrderByIdSchema>;
export type TGetOrdersByCustomerSchema = z.infer<typeof getOrdersByCustomerSchema>;
export type TUpdateOrderStatusSchema = z.infer<typeof updateOrderStatusSchema>;
export type TCancelOrderSchema = z.infer<typeof cancelOrderSchema>;

// Payment schemas
export const initializePaymentSchema = z.object({
  order_id: z.string(),
  email: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().default("NGN"),
  callback_url: z.string().url().optional(),
});

export const verifyPaymentSchema = z.object({
  reference: z.string(),
  order_id: z.string(),
});

export const createTransactionSchema = z.object({
  order_id: z.string(),
  type: z.enum(["authorization", "capture", "refund", "chargeback"]),
  amount: z.number().positive(),
  currency: z.string().default("NGN"),
  payment_provider: z.string().optional(),
  provider_reference: z.string().optional(),
  status: z.enum(["pending", "succeeded", "failed"]).default("pending"),
  processor_response: z.record(z.any()).optional(),
});

export type TInitializePaymentSchema = z.infer<typeof initializePaymentSchema>;
export type TVerifyPaymentSchema = z.infer<typeof verifyPaymentSchema>;
export type TCreateTransactionSchema = z.infer<typeof createTransactionSchema>;

// Delivery tracking schemas
export const createDeliveryTrackingSchema = z.object({
  order_id: z.string(),
  order_lineitem_id: z.string().optional().or(z.literal("none")),
  carrier: z.string().min(1, "Carrier is required"),
  service_level: z.string().optional(),
  tracking_number: z.string().min(1, "Tracking number is required"),
  tracking_url: z.string().url().optional().or(z.literal("")),
  estimated_delivery_at: z.date().optional(),
  status: z.enum(["pending", "in_transit", "out_for_delivery", "delivered", "delayed", "failed"]).default("pending"),
});

export const updateDeliveryTrackingSchema = z.object({
  id: z.string(),
  carrier: z.string().optional(),
  service_level: z.string().optional(),
  tracking_number: z.string().optional(),
  tracking_url: z.string().url().optional().or(z.literal("")),
  estimated_delivery_at: z.date().optional(),
  shipped_at: z.date().optional(),
  delivered_at: z.date().optional(),
  status: z.enum(["pending", "in_transit", "out_for_delivery", "delivered", "delayed", "failed"]).optional(),
  proof_of_delivery: z.record(z.any()).optional(),
});

export const signUpSchema = z.object({
  first_name: z.string().min(2, "First name is required"),
  last_name: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type TSignUpSchema = z.infer<typeof signUpSchema>;

export const getDeliveriesByOrderSchema = z.object({
  order_id: z.string(),
});

export const getOrdersNeedingShippingSchema = z.object({
  publisher_id: z.string().optional(),
});

export type TCreateDeliveryTrackingSchema = z.infer<typeof createDeliveryTrackingSchema>;
export type TUpdateDeliveryTrackingSchema = z.infer<typeof updateDeliveryTrackingSchema>;
export type TGetDeliveriesByOrderSchema = z.infer<typeof getDeliveriesByOrderSchema>;
export type TGetOrdersNeedingShippingSchema = z.infer<typeof getOrdersNeedingShippingSchema>;

export const updateAuthorSchema = z.object({
  id: z.string(), // Required to identify which author to update
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  phone_number: z.string().optional(),
});

export type TUpdateAuthorSchema = z.infer<typeof updateAuthorSchema>;


export const updateCustomerSchema = z.object({
  id: z.string(), // Required to target the specific customer record
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().optional(),
  publisher_id: z.string().optional(), // In case you need to reassign to a different org
});

export type TUpdateCustomerSchema = z.infer<typeof updateCustomerSchema>;