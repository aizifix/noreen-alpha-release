# Profile Picture Feature Documentation

## Overview
This feature allows users (Admin and Client) to upload and manage their profile pictures with crop functionality.

## Features
- Upload profile pictures from Settings page
- Image cropping with zoom and rotation controls
- Circular crop preview
- Automatic deletion of old profile pictures
- Support for JPG, PNG, GIF, and WebP formats
- Responsive modal interface

## Components

### Frontend Components

#### 1. ProfilePictureModal Component (`components/ProfilePictureModal.tsx`)
- React component with image upload and crop functionality
- Uses `react-image-crop` library for cropping interface
- Features:
  - Drag & drop file upload
  - Image preview with crop area selection
  - Zoom control (0.5x to 3x)
  - Rotation control (-180° to 180°)
  - Real-time circular preview
  - Upload progress indicator

#### 2. Settings Pages
- **Admin Settings** (`app/(authenticated)/admin/settings/page.tsx`)
  - Full settings interface with profile, security, website customization, feedback, notifications, and advanced tabs
  - Profile picture upload button with camera icon

- **Client Settings** (`app/(authenticated)/client/settings/page.tsx`)
  - Simplified settings interface with only profile and security tabs
  - Same profile picture upload functionality as admin

### Backend Implementation

#### 1. Admin API (`app/api/admin.php`)
- `uploadProfilePicture()` method:
  - Validates file type (images only)
  - Generates unique filename with user ID and timestamp
  - Deletes old profile picture before saving new one
  - Updates database with new file path
  - Returns success/error response with file path

#### 2. Client API (`app/api/client.php`)
- Added profile management methods:
  - `getUserProfile()` - Fetch user profile data
  - `updateUserProfile()` - Update user information
  - `changePassword()` - Change user password
  - `uploadProfilePicture()` - Upload profile picture (same as admin)

#### 3. Image Server (`app/api/serve-image.php`)
- Serves uploaded images securely
- Handles missing images by returning default profile picture
- Validates file is an actual image
- Sets appropriate caching headers

## Database Schema
The `tbl_users` table includes:
- `user_pfp` (VARCHAR) - Stores the file path of the user's profile picture

## Installation

1. Install the required npm package:
```bash
npm install react-image-crop
```

2. Ensure the following directories exist with proper permissions:
- `uploads/profile_pictures/`

3. Place a default profile picture at:
- `public/default_pfp.png`

## Usage

### For Users:
1. Navigate to Settings page
2. Click the camera icon on your current profile picture
3. Select or drag & drop an image file
4. Adjust the crop area, zoom, and rotation as needed
5. Click "Save Profile Picture"

### For Developers:
To add profile picture upload to other components:

```tsx
import ProfilePictureModal from "@/components/ProfilePictureModal";

// In your component
const [showModal, setShowModal] = useState(false);

// In JSX
<ProfilePictureModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onUploadSuccess={(filePath) => {
    // Handle successful upload
  }}
  uploadEndpoint="http://localhost/events-api/admin.php" // or client.php
  userId={userId}
/>
```

## Security Considerations
1. File type validation on both client and server
2. File size limits enforced
3. Unique filenames prevent overwrites
4. Old files are deleted to save storage
5. Path traversal attacks prevented in serve-image.php

## Future Enhancements
- Add file size limit configuration
- Support for avatar presets
- Integration with registration flow
- Batch upload for multiple users (admin feature)
- Image filters and effects
