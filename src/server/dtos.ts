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
  tenant_id: z.string().optional(),
  tenant_name: z.string().optional(),
  slug: z.string().nullable().optional(),
  white_label: z.boolean().optional(),
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
  pen_name: z.string().optional(),
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
  pen_name: z.string().optional(),
  slug: z.string().optional(),
  publisher_id: z.string().optional(),
  last_name: z.string().optional(),
  phone_number: z.string().optional(),
});

export const upgradeToAuthorSchema = z.object({});

export const upgradeToPublisherSchema = z.object({
  organization_name: z.string().min(2, "Organization name is required"),
  tenant_slug: z.string().min(3, "Storefront slug must be at least 3 characters"),
});

// Schema for book variant
export const bookVariantSchema = z.object({
  id: z.string().optional(),
  format: z.enum(["hardcover", "paperback", "ebook", "audiobook"]),
  size: z.enum(["A5", "A4", "A6"]).optional(), // Size for physical books only
  size_bucket: z.enum(["A5", "A4", "A6"]).optional(),
  trim_size_mode: z.enum(["standard", "custom"]).optional().default("standard"),
  paper_type: z.enum(["cream", "white"]).optional(),
  lamination_type: z.enum(["matte"]).optional(),
  flap_type: z.enum(["none", "single", "double"]).optional().default("none"),
  custom_width_in: z.number().positive().optional(),
  custom_height_in: z.number().positive().optional(),
  display_width_in: z.number().positive().optional(),
  display_height_in: z.number().positive().optional(),
  isbn13: z.string().optional(),
  language: z.string().default("en"),
  list_price: z.number().min(0, "List price cannot be negative"),
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
  isbn: z.string().regex(/^\d*$/, "ISBN must contain only numbers").optional().or(z.literal("")),
  slug: z.string().optional(),
  description: z.string().optional(),
  synopsis: z.string().optional(),
  cover_image_url: z.string().url("Cover image must be a valid URL").optional(),
  genre: z.string().optional(),
  subject_tags: z.array(z.string()).optional(),
  edition: z.string().optional(),
  publication_date: z.date().optional(),
  default_language: z.string().default("English"),
  
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

  size: z.enum(["A6", "A5", "A4"]).optional().default("A5"),
  trim_size_mode: z.enum(["standard", "custom"]).optional().default("standard"),
  paper_type: z.enum(["cream", "white"]).optional(),
  lamination_type: z.enum(["matte"]).optional(),
  flap_type: z.enum(["none", "single", "double"]).optional().default("none"),
  custom_width_in: z.number().positive().optional().nullable(),
  custom_height_in: z.number().positive().optional().nullable(),
  size_bucket: z.enum(["A6", "A5", "A4"]).optional(),
  display_width_in: z.number().positive().optional().nullable(),
  display_height_in: z.number().positive().optional().nullable(),
 
  // Author/publisher markup on top of the platform base cost.
  // "percentage" = % of print cost added on top.
  // "flat"       = fixed NGN amount added on top.
  author_markup_type: z.enum(["percentage", "flat"]).optional().default("percentage"),
  author_markup_value: z.number().min(0).optional().default(0),
  special_addon_fee: z.number().min(0).optional().default(0),
  special_addon_description: z.string().optional(),
  custom_fields: z.record(z.any()).optional().default({}),
  admin_private_notes: z.string().optional(),
  
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
    if (data.ebook_price === undefined || data.ebook_price === null || data.ebook_price < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "E-book price is required",
        path: ["ebook_price"],
      });
    }
  }

  if ((data.paper_back || data.hard_cover) && data.trim_size_mode === "custom") {
    if (!data.custom_width_in || !data.custom_height_in) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom width and height are required for custom trim size",
        path: ["custom_width_in"],
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
  price: z.number().min(0, "Price cannot be negative"),
  quantity: z.number().int().positive().optional(), 
  total: z.number().min(0, "Total cannot be negative"), 
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
export const toggleUserActiveSchema = z.object({
  id: z.string(),
  active: z.boolean(),
});
export const permanentDeleteUserSchema = z.object({
  id: z.string(),
  confirmation: z.literal("delete"),
});
export type TCreateUserSchema = z.infer<typeof createUserSchema>;
export type TAssignRoleSchema = z.infer<typeof assignRoleSchema>;

// System Settings schemas
export const getSystemSettingsSchema = z.object({});

export const updateSystemSettingsSchema = z.object({
  key: z.string(),
  value: z.any(),
});

export const reportBookIssueSchema = z.object({
  book_id: z.string(),
  issue_type: z.enum(["piracy", "intellectual_property"]),
  description: z.string().min(10, "Please provide more detail"),
  reporter_name: z.string().optional(),
  reporter_email: z.string().email().optional().or(z.literal("")),
});

export const updateBookIssueReportStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["open", "in_review", "resolved", "dismissed"]),
  reviewer_notes: z.string().optional(),
});

export type TGetSystemSettings = z.infer<typeof getSystemSettingsSchema>;
export type TUpdateSystemSettings = z.infer<typeof updateSystemSettingsSchema>;
export type TReportBookIssueSchema = z.infer<typeof reportBookIssueSchema>;
export type TUpdateBookIssueReportStatusSchema = z.infer<typeof updateBookIssueReportStatusSchema>;

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
  shipping_provider: z.enum(["speedaf", "fez"]).optional(),
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
  amount: z.number().min(0, "Amount cannot be negative"),
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
  pen_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").optional().or(z.literal("")),
  phone_number: z.string().optional(),
});

export type TUpdateAuthorSchema = z.infer<typeof updateAuthorSchema>;

export const inviteAuthorSchema = z.object({
  author_id: z.string(),
  email: z.string().email("Valid email required"),
});

export const authorAccountSetupSchema = z.object({
  token: z.string().min(1),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  pen_name: z.string().optional(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export const resendAuthorInviteSchema = z.object({
  author_id: z.string(),
  inviter_user_id: z.string(),
  email: z.string().email("Valid email required").optional(),
});

export type TInviteAuthorSchema = z.infer<typeof inviteAuthorSchema>;
export type TAuthorAccountSetupSchema = z.infer<typeof authorAccountSetupSchema>;
export type TResendAuthorInviteSchema = z.infer<typeof resendAuthorInviteSchema>;


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


// Staff invite — super admin sends email + role only.
// No name, no password. Staff sets those themselves on setup page.
export const inviteStaffSchema = z.object({
  email:     z.string().email("Valid email required"),
  role_name: z.string().min(1, "Role is required"),
  // tenant_id resolved server-side from the inviting AdminUser's record
});
 
export type TInviteStaffSchema = z.infer<typeof inviteStaffSchema>;
 
// Staff account setup — called when staff clicks the invite link.
// They provide their name and choose a password.
export const staffAccountSetupSchema = z.object({
  token:      z.string().min(1),
  first_name: z.string().min(1, "First name is required"),
  last_name:  z.string().min(1, "Last name is required"),
  password:   z.string()
    .min(8,  "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/,  "Must contain at least one number"),
});
 
export type TStaffAccountSetupSchema = z.infer<typeof staffAccountSetupSchema>;

export const setPublisherAuthorSplitSchema = z.object({
  author_id:               z.string(),
  publisher_split_percent: z
    .number()
    .min(0,  "Publisher split cannot be negative")
    .max(95, "Publisher split cannot exceed 95% — author must receive at least 5%"),
  notes:        z.string().max(300).optional(),
  publisher_id: z.string().optional(), // super-admin only
});
 
export const setBookSplitOverrideSchema = z.object({
  book_id:                 z.string(),
  publisher_split_percent: z
    .number()
    .min(0,  "Publisher split cannot be negative")
    .max(95, "Publisher split cannot exceed 95%"),
  notes: z.string().max(300).optional(),
});
 
export const deleteBookSplitOverrideSchema = z.object({
  book_id: z.string(),
});
 
export const getPublisherSplitsSchema = z.object({
  publisher_id: z.string().optional(),
});
 
export type TSetPublisherAuthorSplitSchema = z.infer<typeof setPublisherAuthorSplitSchema>;
export type TSetBookSplitOverrideSchema    = z.infer<typeof setBookSplitOverrideSchema>;
export type TDeleteBookSplitOverrideSchema = z.infer<typeof deleteBookSplitOverrideSchema>;
export type TGetPublisherSplitsSchema      = z.infer<typeof getPublisherSplitsSchema>;
 
export const verifyBankAccountSchema = z.object({
  bank_code:      z.string().min(1, "Bank code is required"),
  account_number: z.string().length(10, "Account number must be 10 digits"),
});
 
export const saveBankAccountSchema = z.object({
  bank_code:      z.string().min(1),
  bank_name:      z.string().min(1),
  account_number: z.string().length(10),
  account_name:   z.string().min(1),
});
 
export type TVerifyBankAccountSchema = z.infer<typeof verifyBankAccountSchema>;
export type TSaveBankAccountSchema   = z.infer<typeof saveBankAccountSchema>;


export const updateProfileImageSchema = z.object({
  id: z.string(),
  profilePicture: z.string().url("Invalid image URL"),
});

export type TUpdateProfileImageSchema = z.infer<typeof updateProfileImageSchema>;
