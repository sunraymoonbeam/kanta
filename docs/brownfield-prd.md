### UI/UX Specification: Kanta React & Next.js Frontend

-----

#### 1\. Introduction & Goals

This document details the UI/UX design for the Kanta disposable film camera web application's new React & Next.js frontend. The primary goal is to create an immersive, intuitive, and visually cohesive experience that truly feels like using a disposable film camera for events like weddings and birthdays, alongside clear and functional photo and face viewing capabilities.

#### 2\. Visual Design & Aesthetic (`"Disposable Camera Lens" Feel`)

The overall aesthetic will lean heavily into a **retro** and **vintage** feel, reminiscent of classic disposable cameras and analog photography.

  * **Overall Theme/Mood**: Retro, nostalgic, slightly gritty or textured, with a focus on simplicity and functionality that evokes a bygone era.
  * **Color Palette**:
      * `#222831` (Dark Slate - Primary background, deep accents)
      * `#31363F` (Charcoal Grey - Secondary backgrounds, darker elements)
      * `#76ABAE` (Teal Blue - Accent color, interactive elements, highlights)
      * `#EEEEEE` (Light Grey - Text, subtle backgrounds, paper-like elements)
  * **Typography**: A vintage-looking sans-serif font will be selected for headings and primary text, complemented by a mono-spaced or distressed-looking font for numerical displays (e.g., shot counter) and specific retro accents.
  * **Imagery & Icons**: Icons will adopt a clear **retro style**, possibly outlined, hand-drawn, or pixel-art influenced, avoiding modern flat or gradient styles. Visual elements like "lens" borders, film grain overlays, and light leaks will be strategically used to enhance the immersive feel.
  * **Visual Effects**:
      * **Lens Effect**: The primary camera view will feature a subtle **vignetting** effect around the edges, simulating looking through a physical lens. A slight, adjustable **film grain overlay** will be present to enhance the retro feel. The camera feed itself will occupy the center within this framed view.
      * **Flash Effect**: Upon successful photo capture, a brief, bright white overlay animation will flash across the screen, mimicking a camera flash.
      * **Shutter Animation**: When the shutter button is pressed, a quick, mechanical-like animation (e.g., a simulated aperture closing and opening, or a quick black-out) will occur.

#### 3\. Core User Flows & Interaction Design

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

#### 4\. Key UI Components (Recommendations)

  * **Navigation Components**: Tab bar for main navigation, potentially a header bar with event title and event-specific actions.
  * **Camera View Components**:
      * Video Stream Component (for live camera feed).
      * Shutter Button Component.
      * Shot Counter Component.
      * Flash Overlay Component.
      * File Input/Uploader Component.
  * **Album/Gallery Components**:
      * Responsive Image Grid Component (for shared album).
      * Image Modal/Lightbox Component (for full-screen image view).
      * Face Overlay/Highlight Component (to show bounding boxes on images).
  * **Clustering Components**:
      * Cluster Card/Thumbnail Component (for representative images).
      * Cluster Detail Gallery Component.
  * **General UI Components**: Buttons (various styles), Input Fields (for future event details), Loading Spinners, Toast/Notification Messages, Modals.

#### 5\. Wireframes / Mockups (Conceptual - to be created separately)

Visual mockups will be essential for each of these views to solidify the design:

  * **Event Landing Page Mockup** (Future)
  * **Main App - Camera View Mockup**: Showing the lens effect, live feed, shutter button, and shot counter.
  * **Main App - Shared Album View Mockup**: Demonstrating the grid layout and thumbnail display.
  * **Main App - Single Photo View Mockup**: Showing an enlarged photo with basic info and the option to view faces.
  * **Main App - Clustered Faces Overview Mockup**: Displaying representative images for each cluster.
  * **Main App - Cluster Detail View Mockup**: Showing photos belonging to a selected cluster.

#### 6\. Responsiveness

The application will be designed with a **mobile-first approach**. Layouts and components will gracefully adapt to desktop and tablet screens, ensuring a consistent and pleasant experience across all devices. The camera view will prioritize fitting the live feed and controls intuitively on smaller screens.

#### 7\. Accessibility Considerations

  * **Semantic HTML**: Use appropriate HTML5 elements for structure and meaning.
  * **Keyboard Navigation**: Ensure all interactive elements are reachable and operable via keyboard.
  * **Alternative Text**: Provide descriptive `alt` text for all images.
  * **Color Contrast**: Adhere to WCAG guidelines for color contrast, especially with the retro color palette, to ensure readability.
  * **Focus Management**: Manage focus logically for users navigating with assistive technologies.

-----

This `front-end-spec.md` details the UI/UX requirements. I can now use this to define the technical architecture for the React/Next.js frontend.
