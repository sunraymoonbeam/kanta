# 3. Core User Flows & Interaction Design

**A. Event Landing Page (Future Implementation)**

This page serves as an entry point for event participants.

  * **Content**: Event title (prominent), short description of the event, and a captivating background image relevant to the event.
  * **Call to Action**: A clear "Join Event" button for users to proceed to the main web app.
  * **Customization**: This page will eventually be customizable by the event organizer (details to be defined in a separate future specification).

**B. User Web App (Main Application - Three-Tab Interface)**

Once the user joins an event, they will land in the main application, structured with three distinct tabs for primary navigation: **Take Pictures**, **View Pictures (Shared Album)**, and **View Clustered Faces**.

  * **Navigation**: A prominent tab bar or similar navigation element will allow users to switch between these three main sections. The active tab should be clearly highlighted.

-----

**B.1. Take Pictures (Camera View)**

This tab will be the immersive "disposable camera" experience.

  * **Layout**: The primary focus will be the camera's live feed, framed by the "lens effect" described in Section 2.
  * **Shot Counter**: A **retro-styled counter** (e.g., digital segment display font) will be prominently displayed, indicating the number of shots remaining (e.g., "15/20"). It will decrement with each photo taken. When the counter reaches 0, the shutter button will be visually disabled, and a subtle "film roll finished" message may appear.
  * **Shutter Button**: A large, tactile-looking button, visually styled to resemble a physical camera shutter. It will be positioned for easy access, especially on mobile.
  * **Photo Capture**:
    1.  User clicks/taps the shutter button.
    2.  Shutter animation and flash effect occur.
    3.  A brief, subtle "click" sound plays.
    4.  The photo is immediately uploaded to the backend.
    5.  A small, temporary confirmation (e.g., a "Photo Uploaded\!" toast or icon) appears.
  * **Upload Option**: A separate, less prominent button or icon will allow users to manually upload photos from their device's gallery. This flow will include a file picker and a progress indicator.

-----

**B.2. View Pictures (Shared Album)**

This tab displays all photos uploaded to the current event.

  * **Layout**: A **typical grid-type album** will be used, displaying photo thumbnails in an organized, responsive grid. The grid should adapt gracefully to different screen sizes.
  * **Navigation**: Users can scroll infinitely (or paginate for very large albums) through the photos.
  * **Photo Interaction**:
      * Clicking on a thumbnail will open a full-screen view of the image.
      * In the full-screen view, basic metadata (e.g., uploader, timestamp) can be displayed.
      * **Crucially**: From this full-screen view, an option or section will be available to **view clustered faces within that specific image**. This could be an overlay, a sidebar, or a dedicated button that highlights detected faces and allows interaction to see their clusters.

-----

**B.3. View Clustered Faces**

This tab provides an overview of all detected face clusters across the entire event.

  * **Layout**: This view will present a gallery of **representative images for each detected face cluster**. Each cluster will be clearly labeled (e.g., "Cluster 1," or if possible, a name once a naming feature is implemented in the future).
  * **Cluster Interaction**:
      * Clicking on a cluster's representative image will open a new view (or a modal/gallery) displaying **all photos from the shared album that contain faces belonging to that specific cluster**. This provides a way to see all photos of a particular person or group.
  * **Alternative Access to Clustered Faces**: As mentioned in B.2, users can also access face clustering information directly from individual images within the Shared Album. This tab provides a global overview.

-----