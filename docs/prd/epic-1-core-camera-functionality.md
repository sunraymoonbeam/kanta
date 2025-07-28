# Epic 1: Core Camera Functionality

## Epic Overview
Implement the core disposable camera experience for the Kanta web application, allowing users to take pictures with a retro camera interface.

## Epic Goals
- Create an immersive disposable camera experience
- Implement camera capture functionality with retro visual effects
- Enable photo uploads to the backend
- Provide a shot counter limiting photos per user

## User Stories

### Story 1.1: Camera View Layout and Basic UI
**As a** user attending an event  
**I want** to see a retro-styled camera interface  
**So that** I can experience the nostalgic feel of using a disposable camera

**Acceptance Criteria:**
1. Camera view displays live camera feed centered on screen
2. Lens vignetting effect is applied around the edges of the camera feed
3. Film grain overlay is visible on the camera feed
4. Shot counter displays remaining shots in retro digital segment font (e.g., "20/20")
5. Large shutter button is prominently displayed and styled like a physical camera button
6. Upload button is present but less prominent than shutter button
7. Interface follows the defined color palette (#222831, #31363F, #76ABAE, #EEEEEE)

### Story 1.2: Photo Capture with Effects
**As a** user  
**I want** to take photos with authentic camera effects  
**So that** my experience feels like using a real disposable camera

**Acceptance Criteria:**
1. Clicking shutter button triggers shutter animation (aperture close/open effect)
2. Flash effect displays as white overlay after capture
3. Camera click sound plays on capture
4. Shot counter decrements after each photo
5. Shutter button becomes disabled when shot counter reaches 0
6. "Film roll finished" message appears when no shots remain

### Story 1.3: Photo Upload to Backend
**As a** user  
**I want** my photos to be automatically uploaded after capture  
**So that** they are saved to the event album without manual intervention

**Acceptance Criteria:**
1. Photos are uploaded immediately after capture
2. Upload progress indicator shows during upload
3. "Photo Uploaded!" confirmation appears after successful upload
4. Failed uploads show error message with retry option
5. Photos are associated with the current event ID
6. Upload includes metadata (timestamp, user info if available)

### Story 1.4: Manual Photo Upload from Gallery
**As a** user  
**I want** to upload existing photos from my device  
**So that** I can add photos I've already taken to the event album

**Acceptance Criteria:**
1. Upload button opens device file picker
2. File picker filters for image files only
3. Selected photos show preview before upload
4. Upload progress indicator displays during upload
5. Multiple photos can be selected and uploaded
6. Uploaded photos count against shot limit

## Technical Considerations
- Mobile-first responsive design
- WebRTC or getUserMedia API for camera access
- Canvas API for applying visual effects
- Web Audio API for sound effects
- Progressive enhancement for devices without camera access
- Optimization for mobile performance

## Dependencies
- Backend API endpoints for photo upload
- Authentication/session management for tracking shot count per user
- Cloud storage integration for photo storage

## Success Metrics
- Users successfully capture photos using the camera interface
- 90%+ of captured photos upload successfully
- Camera interface loads within 2 seconds
- Visual effects render smoothly without impacting performance