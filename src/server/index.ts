import {
  assignRoleToUser,
  createRole,
  createUser,
  deleteUser,
  getAllRoles,
  getAllUsers,
  getUserById,
  updateUser,
  updateUserProfile
} from "./module/user";
import { publicProcedure, router } from "./trpc";
import { createPublisher, deletePublisher, getAllPublisher, updatePublisher, getPublisherByOrganization   } from "./module/publisher";
import { createAuthor, deleteAuthor, getAllAuthors, signUpAuthor, getAuthorsByUser, getAuthorBySlug } from "./module/author";
import { createCustomer, deleteCustomer, updateCustomer, getAllCustomers, getCustomersByUser } from "./module/customer";
import { createBook, deleteBook, updateBook, getAllBooks, getBookById, getBookByAuthor , toggleBookFeatured,getAllFeaturedBooks, getNewArrivalBooks } from "./module/book";
import { createChapter, updateChapter, deleteChapter, getAllChapters, viewChapterById, getAllChapterByBookId } from "./module/chapter";
import {  updateTenant, getAllTenant, deleteTenant, createTenant } from "./module/tenant";
import { createImageUpload } from "./module/uploads";
import { createHeroSlide, getAllHeroSlides } from "./module/slider";
import { getAllBanners, createBanner, toggleBannerVisibility } from "./module/banner";
import { createReview, getReviewsByBook } from "./module/review";

export const appRouter = router({
  createUser,
  updateUser,
  getAllUsers,
  updateUserProfile,
  deleteUser,
  getUserById,
  createRole,
  assignRoleToUser,
  getAllRoles,
  createPublisher,
  deletePublisher,
  getAllPublisher,
  updatePublisher,
  getPublisherByOrganization,
  createAuthor,
  deleteAuthor,
  signUpAuthor,
  getAuthorBySlug,
  getAuthorsByUser,
  getAllAuthors,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getAllCustomers,
  getCustomersByUser,
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
  getAllChapterByBookId,
  toggleBookFeatured,
  getAllFeaturedBooks,
  getNewArrivalBooks,
  updateTenant,
  getAllTenant,
  deleteTenant,
  createTenant,
  createImageUpload,
  createHeroSlide,
  getAllHeroSlides,
  getAllBanners,
  toggleBannerVisibility,
  createBanner,
  createReview,
  getReviewsByBook,
  healthCheck: publicProcedure.query(() => {
    return { message: "API up and running..." };
  }),
});

export type AppRouter = typeof appRouter;
