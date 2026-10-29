# QuickAI

QuickAI is an AI-powered content and image creation web app. It has a React/Vite client and an Express API, with Clerk authentication, Neon PostgreSQL storage, Gemini text generation, Clipdrop image generation, and ImageKit image processing/storage.

## Features

- Generate articles and blog titles
- Generate images from text prompts
- Remove image backgrounds and objects
- Review PDF resumes
- Browse published creations and like/unlike them
- View your recent creations and subscription status

## Project structure

```text
QuickAI/
├── Client/    React + Vite frontend
└── server/    Express API
```

## Requirements

- Node.js 20 or newer
- npm
- Accounts/API credentials for Clerk, Neon, Gemini, Clipdrop, and ImageKit

## Configure environment variables

Create `Client/.env`:

```env
VITE_BASE_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
```

Create `server/.env`:

```env
PORT=3000
DATABASE_URL=your-neon-database-connection-string
CLERK_SECRET_KEY=your-clerk-secret-key
GEMINI_API_KEY=your-gemini-api-key
CLIPDROP_API_KEY=your-clipdrop-api-key
IMAGEKIT_PUBLIC_KEY=your-imagekit-public-key
IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-imagekit-id

# Used by the server's Cloudinary initialization.
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

Use credentials from the same Clerk application for the frontend and backend. Keep secret keys in `server/.env`; never put server secrets in client environment variables or commit either `.env` file.

## Install and run locally

Install dependencies in each app:

```powershell
cd Client
npm install
cd ..\server
npm install
```

Start the API in one terminal:

```powershell
cd server
npm run server
```

Start the frontend in another terminal:

```powershell
cd Client
npm run dev
```

Vite prints the local frontend URL when it starts. The API health check is available at `http://localhost:3000/`.

## API routes

The API is mounted under `/api`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/ai/generate-article` | Generate an article |
| POST | `/api/ai/generate-blog-title` | Generate blog title suggestions |
| POST | `/api/ai/generate-image` | Generate and save an image |
| POST | `/api/ai/remove-image-background` | Remove an uploaded image's background |
| POST | `/api/ai/remove-image-object` | Remove an object from an uploaded image |
| POST | `/api/ai/resume-review` | Review an uploaded PDF resume |
| GET | `/api/user/get-user-creations` | Get the signed-in user's creations |
| GET | `/api/user/get-published-creations` | Get published creations |
| POST | `/api/user/toggle-like-creation` | Like or unlike a creation |

Protected routes require a Clerk session token in the `Authorization: Bearer <token>` header. Upload routes expect multipart form data; use the `image` field for image operations and `resume` for resume review.

## Useful commands

Client production build:

```powershell
cd Client
npm run build
```

Client lint:

```powershell
cd Client
npm run lint
```

Run the API without Nodemon:

```powershell
cd server
npm start
```
