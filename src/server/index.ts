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
  updateProfileImage,
} from "./module/user";
import { publicProcedure, router } from "./trpc";
import { createPublisher, deletePublisher, getAllPublisher, updatePublisher, getPublisherByOrganization, getPublisherDashboardStats } from "./module/publisher";
import { createAuthor, updateAuthor, deleteAuthor, getAllAuthors, signUpAuthor, getAuthorsByUser, getAuthorBySlug, getAuthorDashboardStats } from "./module/author";
import { createCustomer, deleteCustomer, updateCustomer, getAllCustomers, getCustomersByUser, registerGuestAndTransferCart, getCustomerDashboardStats } from "./module/customer";
import { createBook, deleteBook, updateBook, getAllBooks, getBookById, getCategories, getBookByAuthor, toggleBookFeatured,getAllFeaturedBooks, getNewArrivalBooks, getPurchasedBooksByCustomer, generateWatermarkedEbook, searchEverything, approveBook } from "./module/book";
import { createChapter, updateChapter, deleteChapter, getAllChapters, viewChapterById, getAllChapterByBookId } from "./module/chapter";
import {  updateTenant, getAllTenant, deleteTenant, createTenant, getTenantBySlug, getStoreBySlug } from "./module/tenant";
import { imageUpload, createImageUpload } from "./module/uploads";
import { createHeroSlide, getAllHeroSlides, getGlobalHeroSlides, deleteHeroSlide } from "./module/slider";
import { getAllBanners, createBanner, toggleBannerVisibility, getGlobalBanners, deleteBanner } from "./module/banner";
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
  toggleFeatured,
  getSystemSettings,
  updateSystemSettings,
  inviteStaff,
  setupStaffAccount,
  resendStaffInvite,
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
  updateLineItemFulfillment,
} from "./module/order";
import {
  initializePayment,
  verifyPayment,
  createTransaction,
  getTransactionsByOrder,
} from "./module/payment";
// import { generateWatermarkedEbook } from "./module/watermark";
import { getChapterContent } from "./module/reader";

import {
  forgotPassword,
  resetPassword,
  changePassword,
  resendVerificationEmail,
  getAuthorPricingContext,
} from "./module/auth";

import {
  getPublisherStoreSettings,
  updatePublisherStoreSettings,
} from "./module/store-settings";

import {
  getPublisherSplits,
  setPublisherAuthorSplit,
  setBookSplitOverride,
  deleteBookSplitOverride,
} from "./module/splits";

import {
  listBanks,
  verifyBankAccount,
  saveBankAccount,
  getMyPaymentAccount,
} from "./module/payment-accounts";

import { getPaymentHistory } from "./module/payment-history";

import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./module/category";

import {
  submitKyc,
  getMyKyc,
  getAllKycSubmissions,
  reviewKyc,
  getKycRequirements,
  updateKycRequirements,
} from "./module/kyc";

export const appRouter = router({
  createUser,
  updateUser,
  getAllUsers,
  forgotPassword,
  resetPassword,
  changePassword,
  resendVerificationEmail,
  updateUserProfile,
  updateProfileImage,
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
  getStoreBySlug,
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
  approveBook,
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
  getGlobalHeroSlides,
  deleteHeroSlide,    
  getGlobalBanners,   
  deleteBanner,
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
  updateLineItemFulfillment,
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
  getSystemSettings,
  updateSystemSettings,

  inviteStaff,
  setupStaffAccount,
  resendStaffInvite,

  updatePublisherStoreSettings,
  getPublisherStoreSettings,

  getPublisherSplits,
  setPublisherAuthorSplit,
  setBookSplitOverride,
  deleteBookSplitOverride,

  listBanks,
  verifyBankAccount,
  saveBankAccount,
  getMyPaymentAccount,
  getPaymentHistory,

  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,

  submitKyc,
  getMyKyc,
  getAllKycSubmissions,
  reviewKyc,
  getKycRequirements,
  updateKycRequirements,

  getAuthorPricingContext,
  
  healthCheck: publicProcedure.query(() => {
    return { message: "API up and running..." };
  }),
});

export type AppRouter = typeof appRouter;