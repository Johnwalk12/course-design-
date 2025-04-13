# MySpeakCoach Course Design

This repository contains the design assets and functionality for the MySpeakCoach course platform. The files are served via jsDelivr CDN for optimal performance.

## Repository Structure

- `css/` - Contains all stylesheets
- `js/` - Contains all JavaScript functionality

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Usage

To use these assets in your course pages, include the following in your HTML:

```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Johnwalk12/course-design-/css/main.css">

<!-- JavaScript -->
<script src="https://cdn.jsdelivr.net/gh/Johnwalk12/course-design-/js/main.js"></script>
<script src="https://cdn.jsdelivr.net/gh/Johnwalk12/course-design-/js/quiz-system.js"></script>
<script src="https://cdn.jsdelivr.net/gh/Johnwalk12/course-design-/js/voice-recording.js"></script>
```

## Integration with Hostinger

1. Create a new page in your Hostinger control panel
2. Add an empty section where you want the course content to appear
3. Insert the HTML code that includes the CSS and JavaScript files from jsDelivr
4. Add your course-specific content within the designated section

## Updating Course Materials

To update the course materials:
1. Make changes to the relevant files in this repository
2. Commit and push the changes to GitHub
3. The changes will automatically be available through jsDelivr

## Version Control

This repository uses semantic versioning. When making significant changes:
1. Update the version number in the jsDelivr URLs
2. Create a new release in GitHub
3. Update the URLs in your course pages if necessary

## Note About Course Content

The actual course content (HTML lessons) is stored in a separate private repository. This public repository contains only the shared functionality and styling that can be used by others under the MIT License. 