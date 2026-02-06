import {
  assignRoleToUser,
  createRole,
  createUser,
  deleteUser,
  getAllRoles,
  getAllUsers,
  getUserById,
  updateUser,
  updateUserProfile,
  signUpCustomer,
  checkSlugAvailability,
  checkUsernameAvailability,
} from "./module/user";
import { publicProcedure, router } from "./trpc";
import { createPublisher, deletePublisher, getAllPublisher, updatePublisher, getPublisherByOrganization, getPublisherDashboardStats } from "./module/publisher";
import { createAuthor, updateAuthor, deleteAuthor, getAllAuthors, signUpAuthor, getAuthorsByUser, getAuthorBySlug, getAuthorDashboardStats } from "./module/author";
import { createCustomer, deleteCustomer, updateCustomer, getAllCustomers, getCustomersByUser, registerGuestAndTransferCart, getCustomerDashboardStats } from "./module/customer";
import { createBook, deleteBook, updateBook, getAllBooks, getBookById, getCategories, getBookByAuthor, toggleBookFeatured,getAllFeaturedBooks, getNewArrivalBooks, getPurchasedBooksByCustomer, generateWatermarkedEbook, searchEverything } from "./module/book";
import { createChapter, updateChapter, deleteChapter, getAllChapters, viewChapterById, getAllChapterByBookId } from "./module/chapter";
import {  updateTenant, getAllTenant, deleteTenant, createTenant, getTenantBySlug } from "./module/tenant";
import { imageUpload, createImageUpload } from "./module/uploads";
import { createHeroSlide, getAllHeroSlides } from "./module/slider";
import { getAllBanners, createBanner, toggleBannerVisibility } from "./module/banner";
import { createReview, getReviewsByBook } from "./module/review";
import { createCart, getCartsByUser, deleteCartItem} from "./module/cart";
import {
  createAdminUser,
  updateAdminUser,
  assignRoleToAdminUser,
  removeRoleFromAdminUser,
  getAllAdminUsers,
  getAdminUsersByTenant,
  getAdminUserById,
  deleteAdminUser,
  getAdminRoles,
  getGlobalPlatformStats,
  toggleFeatured
} from "./module/admin";
import {
  createOrderFromCart,
  getOrderById,
  getOrdersByCustomer,
  getOrdersByUser,
  getDeliveriesByCustomer,
  getOrdersNeedingShipping,
  getDeliveriesByOrder,
  createDeliveryTracking,
  updateDeliveryTracking,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
} from "./module/order";
import {
  initializePayment,
  verifyPayment,
  createTransaction,
  getTransactionsByOrder,
} from "./module/payment";
// import { generateWatermarkedEbook } from "./module/watermark";
import { getChapterContent } from "./module/reader";

export const appRouter = router({
  createUser,
  updateUser,
  getAllUsers,
  updateUserProfile,
  signUpCustomer,
  deleteUser,
  getUserById,
  createRole,
  assignRoleToUser,
  getAllRoles,
  createPublisher,
  deletePublisher,
  getAllPublisher,
  getPublisherDashboardStats,
  updatePublisher,
  getPublisherByOrganization,
  checkSlugAvailability,
  checkUsernameAvailability,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  signUpAuthor,
  getAuthorBySlug,
  getAuthorsByUser,
  getAuthorDashboardStats,
  getAllAuthors,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getAllCustomers,
  getCustomersByUser,
  registerGuestAndTransferCart,
  createBook,
  updateBook,
  deleteBook,
  getAllBooks,
  createChapter,
  getAllChapters,
  deleteChapter,
  updateChapter,
  viewChapterById,
  getBookByAuthor,
  getBookById,
  getCategories,
  getPurchasedBooksByCustomer,
  getAllChapterByBookId,
  toggleBookFeatured,
  getAllFeaturedBooks,
  getNewArrivalBooks,
  searchEverything,
  updateTenant,
  getTenantBySlug,
  getAllTenant,
  deleteTenant,
  createTenant,
  imageUpload,
  createImageUpload,
  createHeroSlide,
  getAllHeroSlides,
  getAllBanners,
  toggleBannerVisibility,
  createBanner,
  createReview,
  getReviewsByBook,
  createCart,
  getCartsByUser,
  deleteCartItem,
  // Order management
  createOrderFromCart,
  getOrderById,
  getOrdersByCustomer,
  getOrdersByUser,
  getDeliveriesByCustomer,
  getCustomerDashboardStats,
  getOrdersNeedingShipping,
  getDeliveriesByOrder,
  createDeliveryTracking,
  updateDeliveryTracking,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
  // Payment management
  initializePayment,
  verifyPayment,
  createTransaction,
  getTransactionsByOrder,
  // Watermark management
  generateWatermarkedEbook,
  // Reader management
  getChapterContent,
  // AdminUser management
  createAdminUser,
  updateAdminUser,
  assignRoleToAdminUser,
  removeRoleFromAdminUser,
  getAllAdminUsers,
  getAdminUsersByTenant,
  getAdminUserById,
  deleteAdminUser,
  getAdminRoles,
  toggleFeatured,
  getGlobalPlatformStats,
  healthCheck: publicProcedure.query(() => {
    return { message: "API up and running..." };
  }),
});

export type AppRouter = typeof appRouter;