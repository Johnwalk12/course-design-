
# Cursor Analysis and Fix Prompt

## Context
- Project: Online course template embedded in Hostinger
- Issue: Infinite vertical scrolling space in embedded HTML content
- Environment: VS Code with Cursor AI integration
- File Structure: HTML files embedded in Hostinger, with JS/CSS served via jsDelivr from GitHub

## Current Constraints
- Hostinger horizontal margins: ~10-15% on desktop, ~20% on mobile
- Template includes:
  - Section-by-section navigation
  - Previous/Next buttons
  - Navigation bar
  - Dynamic content loading

## Analysis Request
1. First, scan the entire project directory and analyze:
   ```
   - All HTML files, focusing on the self-talk.html template
   - CSS files for layout and container definitions
   - JavaScript files handling section navigation and content display
   ```

2. Specifically check for:
   - Unbounded height definitions in CSS
   - Flex or Grid containers without proper height constraints
   - JavaScript functions that might affect content height
   - Overflow properties in main containers
   - Viewport height (vh) calculations
   - Container nesting that might cause expansion

## Required Fixes
1. Implement height constraints:
   ```css
   /* Example structure to look for and modify */
   .main-container {
     min-height: [appropriate value];
     max-height: [appropriate value];
     height: [appropriate value];
     overflow-y: auto;
   }
   ```

2. Review and modify:
   - Container height definitions
   - Flexbox/Grid layout properties
   - Overflow properties
   - Viewport-relative units
   - Content wrapper dimensions

## Implementation Guidelines
1. Preserve all functionality:
   - Section navigation
   - Content visibility
   - Interactive elements
   - Responsive design

2. Add viewport-aware constraints:
   - Use relative units where appropriate
   - Implement max-height limits
   - Add proper overflow handling

## Execution Steps
1. Analyze current structure
2. Identify problematic patterns
3. Propose specific fixes
4. Show preview of changes
5. Apply fixes to codebase
6. Test navigation and content display
7. Push changes to current directory

## Output Requirements
- List all modified files
- Explain changes made
- Provide before/after comparison
- Include any new CSS classes or JavaScript modifications

## Important Notes
- Maintain all existing functionality
- Preserve responsive design
- Keep section navigation working
- Ensure content remains accessible
- Maintain proper overflow handling
