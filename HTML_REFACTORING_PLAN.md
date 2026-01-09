# HTML Refactoring Plan

## Overview
This document outlines a comprehensive plan to refactor the HTML files in the project, extracting common components, improving maintainability, and establishing a consistent structure.

## Current Issues

### 1. Code Duplication
- **Age Verification Modal**: Identical markup repeated in all 7 HTML files (~12 lines each)
- **Navigation**: Nearly identical structure across all pages (~18 lines each, ~126 lines total)
- **Footer**: Repeated in 5 pages (~9 lines each, ~45 lines total)
- **Head Section**: Similar meta tags, stylesheets, and scripts repeated (~12 lines each, ~84 lines total)
- **Lightbox**: Duplicated in index.html and gallery.html (~7 lines each)

### 2. Maintenance Challenges
- Updating navigation requires changes in 7 files
- Adding new meta tags requires updating all files
- Inconsistent structure across pages
- No centralized component management

### 3. Structure Issues
- Mixed inline styles (index.html has page-specific styles)
- Inconsistent footer presence (missing in index.html and cms.html)
- CMS page has different navigation structure
- No clear component boundaries

## Proposed Solution

### Phase 1: Component Extraction
Create reusable HTML components using JavaScript modules, similar to the JS refactoring approach.

#### 1.1 Create Component System
- **Location**: `js/components/`
- **Structure**:
  ```
  js/components/
    ├── head.js          # Head section component
    ├── navigation.js    # Navigation component
    ├── footer.js        # Footer component
    ├── ageModal.js      # Age verification modal
    ├── lightbox.js      # Lightbox component
    └── index.js         # Component registry/loader
  ```

#### 1.2 Component Specifications

**Head Component** (`head.js`)
- Accepts: title, description, page-specific styles, scripts
- Returns: Complete `<head>` HTML string
- Handles: Meta tags, stylesheets, fonts, EmailJS script (conditional)

**Navigation Component** (`navigation.js`)
- Accepts: current page identifier, navigation items array
- Returns: Complete `<nav>` HTML string
- Handles: Active link highlighting, mobile menu structure

**Footer Component** (`footer.js`)
- Accepts: Footer links array, copyright text
- Returns: Complete `<footer>` HTML string
- Handles: Footer links, copyright year

**Age Modal Component** (`ageModal.js`)
- Returns: Complete age verification modal HTML
- Static component (no parameters needed)

**Lightbox Component** (`lightbox.js`)
- Accepts: Optional caption support flag
- Returns: Complete lightbox HTML
- Handles: Basic vs. gallery lightbox variations

### Phase 2: Template System
Create base template structure and page-specific templates.

#### 2.1 Base Template
- **Location**: `templates/base.html` or `js/templates/base.js`
- Contains: DOCTYPE, html structure, component placeholders
- Provides: Standard page skeleton

#### 2.2 Page Templates
- **Location**: `templates/pages/` or `js/templates/pages/`
- Individual templates for each page type
- Extend base template with page-specific content

### Phase 3: HTML Structure Improvements

#### 3.1 Semantic HTML
- Ensure proper use of semantic elements (`<header>`, `<main>`, `<section>`, `<article>`, `<aside>`)
- Improve heading hierarchy (h1 → h2 → h3)
- Add proper ARIA labels where needed

#### 3.2 Accessibility Enhancements
- Add skip-to-content links
- Improve form labels and associations
- Add proper ARIA roles and attributes
- Ensure keyboard navigation support
- Add focus indicators

#### 3.3 Meta Tags Standardization
- Create consistent meta tag structure
- Add Open Graph tags for social sharing
- Add Twitter Card meta tags
- Standardize viewport and charset declarations

### Phase 4: Build System Integration (Optional)
Consider adding a build step for HTML processing.

#### 4.1 Options
- **Simple JavaScript**: Use template literals and DOM manipulation
- **Build Tool**: Use a static site generator (11ty, Jekyll, etc.)
- **Web Components**: Native browser component system
- **Server-Side Includes**: If using a server

#### 4.2 Recommended Approach
Start with **JavaScript template system** (similar to current JS architecture):
- No build step required
- Works with current static hosting
- Consistent with existing modular approach
- Easy to maintain and extend

## Implementation Strategy

### Step 1: Create Component Infrastructure
1. Create `js/components/` directory
2. Create component loader utility
3. Implement base template structure

### Step 2: Extract Common Components
1. Extract head component
2. Extract navigation component
3. Extract footer component
4. Extract age modal component
5. Extract lightbox component

### Step 3: Refactor Individual Pages
1. Update index.html to use components
2. Update gallery.html to use components
3. Update services.html to use components
4. Update platforms.html to use components
5. Update book.html to use components
6. Update etiquette.html to use components
7. Update cms.html to use components (with custom nav)

### Step 4: Standardize Structure
1. Ensure consistent page structure across all pages
2. Add semantic HTML elements
3. Improve accessibility attributes
4. Standardize meta tags

### Step 5: Testing & Validation
1. Test all pages render correctly
2. Validate HTML structure
3. Test accessibility with screen readers
4. Verify all links and navigation work
5. Test responsive design

## Detailed Component Specifications

### Head Component
```javascript
/**
 * Generates the <head> section for HTML pages
 * @param {Object} options - Configuration options
 * @param {string} options.title - Page title
 * @param {string} options.description - Meta description
 * @param {string} options.styles - Additional inline styles (optional)
 * @param {boolean} options.includeEmailJS - Include EmailJS script (default: true)
 * @returns {string} - Complete <head> HTML
 */
```

### Navigation Component
```javascript
/**
 * Generates the navigation bar
 * @param {Object} options - Configuration options
 * @param {string} options.currentPage - Current page identifier
 * @param {Array} options.items - Navigation items array
 * @param {boolean} options.isCMS - Use CMS navigation variant (default: false)
 * @returns {string} - Complete <nav> HTML
 */
```

### Footer Component
```javascript
/**
 * Generates the footer section
 * @param {Object} options - Configuration options
 * @param {Array} options.links - Footer links array
 * @param {string} options.copyright - Copyright text (default: auto-generated)
 * @returns {string} - Complete <footer> HTML
 */
```

## Benefits

### Maintainability
- Single source of truth for navigation
- Easy to update common components
- Consistent structure across pages
- Reduced code duplication (~200+ lines saved)

### Scalability
- Easy to add new pages
- Simple to modify site-wide elements
- Component-based architecture
- Clear separation of concerns

### Performance
- Smaller HTML files (components loaded once)
- Better caching opportunities
- Reduced file sizes

### Developer Experience
- Easier to understand structure
- Clear component boundaries
- Consistent patterns
- Better code organization

## Migration Path

### Phase 1: Preparation (Week 1)
- Create component directory structure
- Design component APIs
- Create base template

### Phase 2: Component Development (Week 1-2)
- Implement all components
- Test components in isolation
- Create component documentation

### Phase 3: Page Migration (Week 2)
- Migrate pages one by one
- Test each page after migration
- Fix any issues

### Phase 4: Polish & Optimization (Week 2-3)
- Standardize structure
- Improve accessibility
- Add semantic HTML
- Final testing

## Risk Mitigation

### Potential Issues
1. **Component Loading**: Ensure components load before page render
2. **SEO Impact**: Verify search engines can crawl component-generated HTML
3. **Performance**: Monitor page load times
4. **Browser Compatibility**: Test in all target browsers

### Solutions
1. Use DOMContentLoaded or inline script execution
2. Server-side rendering or static generation (future)
3. Minimize component complexity
4. Use progressive enhancement approach

## Success Metrics

- [ ] All common components extracted
- [ ] Zero code duplication in navigation, footer, head
- [ ] All pages use component system
- [ ] HTML validation passes
- [ ] Accessibility score improved
- [ ] Page load times maintained or improved
- [ ] All functionality preserved

## Next Steps

1. Review and approve this plan
2. Create component directory structure
3. Begin with head component (simplest)
4. Progressively extract other components
5. Migrate pages incrementally
6. Test thoroughly at each step
