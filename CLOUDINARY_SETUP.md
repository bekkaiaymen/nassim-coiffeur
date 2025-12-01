# Cloudinary Setup for Image Uploads

## Why Cloudinary?

Render's free tier uses **ephemeral storage** - any files uploaded to disk are lost when the instance restarts or sleeps. To keep product images persistent, we use Cloudinary (free tier: 25GB storage, 25GB bandwidth/month).

## Setup Instructions

### 1. Create a Free Cloudinary Account
- Go to https://cloudinary.com/users/register_free
- Sign up (free forever for basic usage)

### 2. Get Your Credentials
After signing in:
- Go to Dashboard
- Copy these values:
  - **Cloud Name**
  - **API Key**
  - **API Secret**

### 3. Add to Render Environment Variables
In your Render dashboard:
- Go to your service → Environment
- Add these variables:
  ```
  CLOUDINARY_CLOUD_NAME=your_cloud_name
  CLOUDINARY_API_KEY=your_api_key
  CLOUDINARY_API_SECRET=your_api_secret
  ```

### 4. Deploy
- Commit and push changes
- Render will automatically redeploy
- Images will now be stored on Cloudinary instead of local disk

## Local Development
For local development, images will still use the local `/uploads` folder. To test Cloudinary locally, add the same variables to your `.env` file.
