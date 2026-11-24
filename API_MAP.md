# NEWSMANIA BACKEND - API MAP

Base URL: `http://localhost:5000` (configurable via PORT)

## Global Middleware (applied in app.js)
- **trust proxy**: enabled (for rate limiting behind proxies)
- **helmet()**: security headers
- **cors(corsOptions)**: CORS configuration
- **express.json({ limit: "100kb" })**: JSON body parser (100KB limit)
- **globalLimiter** applied to `/api/*`

## Health Check
| Method | Endpoint | Auth | Middleware | Description |
| --- | --- | --- | --- | --- |
| GET | `/health` | No | - | Health check endpoint. Returns `{ ok: true }` |
| GET | `/` | No | - | Root welcome message |

---

## Authentication Routes (`/api/auth`)
Rate limiting: `authLimiter`, `emailLimiter` as specified.

| Method | Endpoint | Auth | Middleware | Controller | Description |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | No | authLimiter | `register` | Register new user, sends verification email |
| POST | `/api/auth/verify-email` | No | authLimiter | `verifyEmail` | Verify email with code sent during registration |
| POST | `/api/auth/resend-verification` | No | emailLimiter | `resendVerification` | Resend email verification code |
| POST | `/api/auth/google` | No | authLimiter | `googleLogin` | Google OAuth login via popup credential |
| POST | `/api/auth/login` | No | authLimiter | `login` | Standard email/password login |
| POST | `/api/auth/refresh` | No | - | `refresh` | Refresh access token using refresh token (token rotation) |
| POST | `/api/auth/logout` | No | - | `logout` | Server-side logout, revokes refresh token |
| GET | `/api/auth/me` | Yes (User) | authMiddleware | `me` | Get current authenticated user |
| POST | `/api/auth/forgot-password` | No | emailLimiter | `forgotPassword` | Request password reset email |
| POST | `/api/auth/reset-password` | No | authLimiter | `resetPassword` | Reset password using token from email |
| POST | `/api/auth/change-password` | Yes (User) | authMiddleware | `changePassword` | Change password while signed in |

---

## News Routes (`/api/news`)
| Method | Endpoint | Auth | Middleware | Controller | Description |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/news/` | Yes (User + Admin) | authMiddleware, adminMiddleware | `createNewsController` | Create news article |
| GET | `/api/news/` | No | - | `getAllNewsController` | Get all news articles |
| GET | `/api/news/fetch/newsapi` | Yes (User + Admin) | authMiddleware, adminMiddleware | `fetchNewsAPIController` | Fetch news from NewsAPI/GNews |
| GET | `/api/news/fetch/pib` | Yes (User + Admin) | authMiddleware, adminMiddleware | `fetchPIBNewsController` | Fetch news from PIB |
| GET | `/api/news/:id` | No | - | `getNewsByIdController` | Get single news article by ID |
| PUT | `/api/news/:id` | Yes (User + Admin) | authMiddleware, adminMiddleware | `updateNewsController` | Update news article |
| DELETE | `/api/news/:id` | Yes (User + Admin) | authMiddleware, adminMiddleware | `deleteNewsController` | Delete news article |

---

## AI Routes (`/api/ai`)
Rate limiting: `aiLimiter`

| Method | Endpoint | Auth | Middleware | Controller | Description |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/ai/news/:id/analyze` | Yes (User) | authMiddleware, aiLimiter | `generateNewsAnalysisController` | Generate AI analysis for a news article |

---

## MCQ Routes (`/api/mcq`)
| Method | Endpoint | Auth | Middleware | Controller | Description |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/mcq/news/:id/generate` | No | - | `generateMCQsController` | Generate MCQs for a news article |
| GET | `/api/mcq/news/:id` | No | - | `getMCQsByNewsController` | Get MCQs for a specific news article |

---

## Quiz Routes (`/api/quiz`)
| Method | Endpoint | Auth | Middleware | Controller | Description |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/quiz/submit` | Yes (User) | authMiddleware | `submitQuizController` | Submit quiz answers |
| POST | `/api/quiz/daily/submit` | Yes (User) | authMiddleware | `submitDailyQuizController` | Submit daily quiz answers |
| GET | `/api/quiz/history` | Yes (User) | authMiddleware | `getQuizHistoryController` | Get user's quiz history |

---

## Bookmark Routes (`/api/bookmark`)
| Method | Endpoint | Auth | Middleware | Controller | Description |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/bookmark/` | Yes (User) | authMiddleware | `addBookmarkController` | Add news article to bookmarks |
| GET | `/api/bookmark/` | Yes (User) | authMiddleware | `getBookmarksController` | Get user's bookmarks |
| DELETE | `/api/bookmark/:newsId` | Yes (User) | authMiddleware | `removeBookmarkController` | Remove bookmark by newsId |

---

## Daily Quiz Routes (`/api/daily-quiz`)
| Method | Endpoint | Auth | Middleware | Controller | Description |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/daily-quiz/create` | No | - | `createDailyQuizController` | Create today's daily quiz |
| POST | `/api/daily-quiz/rebuild` | No | - | `rebuildDailyQuizController` | Rebuild today's daily quiz (includes newly added MCQs) |
| GET | `/api/daily-quiz/today` | No | - | `getTodayDailyQuizController` | Get today's daily quiz |

---

## Admin Routes (`/api/admin`)
All routes require admin authentication.

| Method | Endpoint | Auth | Middleware | Controller | Description |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/admin/dashboard` | Yes (User + Admin) | authMiddleware, adminMiddleware | `getAdminDashboardController` | Get admin dashboard statistics |
| POST | `/api/admin/mcqs` | Yes (User + Admin) | authMiddleware, adminMiddleware | `createManualMCQController` | Create MCQ manually |
| GET | `/api/admin/mcqs` | Yes (User + Admin) | authMiddleware, adminMiddleware | `listMCQsController` | List all MCQs (admin view) |
| PUT | `/api/admin/mcqs/:id` | Yes (User + Admin) | authMiddleware, adminMiddleware | `updateMCQController` | Update MCQ |
| DELETE | `/api/admin/mcqs/:id` | Yes (User + Admin) | authMiddleware, adminMiddleware | `deleteMCQController` | Delete MCQ |

---

## Dashboard Routes (`/api/dashboard`)
| Method | Endpoint | Auth | Middleware | Controller | Description |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/dashboard/` | Yes (User) | authMiddleware | `getDashboardController` | Get user dashboard data |

---

## Briefing Routes (`/api/briefing`)
| Method | Endpoint | Auth | Middleware | Controller | Description |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/briefing/today` | Yes (User) | authMiddleware | `getDailyBriefingController` | Get daily briefing for user |

---

## Static GK Routes (`/api/static-gk`)
Uses optional auth for public access to view content; auth required for bookmarks and admin operations.

| Method | Endpoint | Auth | Middleware | Controller | Description |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/static-gk/bookmarks` | Yes (User) | authMiddleware | `listStaticGKBookmarksController` | Get user's static GK bookmarks |
| POST | `/api/static-gk/:id/bookmark` | Yes (User) | authMiddleware | `addStaticGKBookmarkController` | Add static GK to bookmarks |
| DELETE | `/api/static-gk/:id/bookmark` | Yes (User) | authMiddleware | `removeStaticGKBookmarkController` | Remove static GK bookmark |
| GET | `/api/static-gk/` | Optional | optionalAuthMiddleware | `listStaticGKController` | List all static GK content (auth affects bookmark status) |
| POST | `/api/static-gk/upload` | Yes (User + Admin) | authMiddleware, adminMiddleware, uploadStaticGKFiles | `uploadStaticGKController` | Upload static GK content with files |
| GET | `/api/static-gk/:id/file` | Optional | optionalAuthMiddleware | `serveStaticGKFileController` | Serve static GK file (PDF/image) |
| GET | `/api/static-gk/:id/thumbnail` | Optional | optionalAuthMiddleware | `serveStaticGKThumbnailController` | Serve static GK thumbnail |
| GET | `/api/static-gk/:id` | Optional | optionalAuthMiddleware | `getStaticGKController` | Get single static GK item |
| PUT | `/api/static-gk/:id` | Yes (User + Admin) | authMiddleware, adminMiddleware | `updateStaticGKController` | Update static GK item |
| DELETE | `/api/static-gk/:id` | Yes (User + Admin) | authMiddleware, adminMiddleware | `deleteStaticGKController` | Delete static GK item |

---

## Key Middleware
- **authMiddleware** - Requires valid JWT access token
- **adminMiddleware** - Requires user with admin role
- **optionalAuthMiddleware** - Attempts auth if token present, continues without auth if not
- **rateLimiters** - `globalLimiter`, `authLimiter`, `emailLimiter`, `aiLimiter`
- **errorMiddleware** - `notFound` (404), `errorHandler` (error responses)
- **staticGkUpload** - File upload handling for static GK content

## File Structure Notes
- Routes: `backend/routes/*.js`
- Controllers: `backend/controllers/*.js`
- Services: `backend/services/*.js`
- Middleware: `backend/middleware/*.js`
- Models: (referenced in controllers/services)
- Validation: `backend/validation/*.js`
- Config: `backend/config/*.js`
