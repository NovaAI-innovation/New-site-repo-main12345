# HTML Refactoring Checklist

## Phase 1: Component Infrastructure Setup

### 1.1 Directory Structure
- [ ] Create `js/components/` directory
- [ ] Create `js/components/head.js`
- [ ] Create `js/components/navigation.js`
- [ ] Create `js/components/footer.js`
- [ ] Create `js/components/ageModal.js`
- [ ] Create `js/components/lightbox.js`
- [ ] Create `js/components/index.js` (component loader)

### 1.2 Component Loader Utility
- [ ] Create component registration system
- [ ] Create component render function
- [ ] Add component caching mechanism
- [ ] Add error handling for missing components

## Phase 2: Component Implementation

### 2.1 Head Component (`head.js`)
- [ ] Create `generateHead()` function
- [ ] Implement title generation
- [ ] Implement meta description
- [ ] Implement meta charset and viewport
- [ ] Implement stylesheet links
- [ ] Implement font preconnect and imports
- [ ] Implement conditional EmailJS script loading
- [ ] Implement page-specific inline styles support
- [ ] Add Open Graph meta tags support
- [ ] Add Twitter Card meta tags support
- [ ] Test head component in isolation
- [ ] Document head component API

### 2.2 Navigation Component (`navigation.js`)
- [ ] Create `generateNavigation()` function
- [ ] Define navigation items data structure
- [ ] Implement navigation HTML generation
- [ ] Implement active link highlighting
- [ ] Implement mobile menu structure
- [ ] Implement CMS navigation variant
- [ ] Add ARIA labels and accessibility attributes
- [ ] Test navigation component in isolation
- [ ] Document navigation component API

### 2.3 Footer Component (`footer.js`)
- [ ] Create `generateFooter()` function
- [ ] Define footer links data structure
- [ ] Implement footer HTML generation
- [ ] Implement copyright year auto-generation
- [ ] Add footer links rendering
- [ ] Test footer component in isolation
- [ ] Document footer component API

### 2.4 Age Modal Component (`ageModal.js`)
- [ ] Create `generateAgeModal()` function
- [ ] Implement age verification modal HTML
- [ ] Ensure consistent structure across all pages
- [ ] Test age modal component in isolation
- [ ] Document age modal component API

### 2.5 Lightbox Component (`lightbox.js`)
- [ ] Create `generateLightbox()` function
- [ ] Implement basic lightbox HTML
- [ ] Implement gallery lightbox variant (with caption)
- [ ] Add lightbox navigation buttons
- [ ] Test lightbox component in isolation
- [ ] Document lightbox component API

### 2.6 Component Index (`index.js`)
- [ ] Export all components
- [ ] Create component registry
- [ ] Implement component initialization helper
- [ ] Add component versioning/tracking
- [ ] Document component usage

## Phase 3: Page Migration

### 3.1 Index Page (`index.html`)
- [ ] Replace head section with component
- [ ] Replace navigation with component
- [ ] Replace age modal with component
- [ ] Replace lightbox with component
- [ ] Verify page-specific styles work
- [ ] Test all functionality
- [ ] Validate HTML structure

### 3.2 Gallery Page (`gallery.html`)
- [ ] Replace head section with component
- [ ] Replace navigation with component
- [ ] Replace age modal with component
- [ ] Replace footer with component
- [ ] Replace lightbox with component (gallery variant)
- [ ] Test all functionality
- [ ] Validate HTML structure

### 3.3 Services Page (`services.html`)
- [ ] Replace head section with component
- [ ] Replace navigation with component
- [ ] Replace age modal with component
- [ ] Replace footer with component
- [ ] Test all functionality
- [ ] Validate HTML structure

### 3.4 Platforms Page (`platforms.html`)
- [ ] Replace head section with component
- [ ] Replace navigation with component
- [ ] Replace age modal with component
- [ ] Replace footer with component
- [ ] Test all functionality
- [ ] Validate HTML structure

### 3.5 Booking Page (`book.html`)
- [ ] Replace head section with component
- [ ] Replace navigation with component
- [ ] Replace age modal with component
- [ ] Replace footer with component
- [ ] Test booking form functionality
- [ ] Validate HTML structure

### 3.6 Etiquette Page (`etiquette.html`)
- [ ] Replace head section with component
- [ ] Replace navigation with component
- [ ] Replace age modal with component
- [ ] Replace footer with component
- [ ] Test all functionality
- [ ] Validate HTML structure

### 3.7 CMS Page (`cms.html`)
- [ ] Replace head section with component
- [ ] Replace navigation with component (CMS variant)
- [ ] Replace age modal with component
- [ ] Consider adding footer (currently missing)
- [ ] Test CMS functionality
- [ ] Validate HTML structure

## Phase 4: HTML Structure Improvements

### 4.1 Semantic HTML
- [ ] Add `<header>` wrapper for navigation
- [ ] Add `<main>` wrapper for main content
- [ ] Ensure proper heading hierarchy (h1 → h2 → h3)
- [ ] Use semantic section elements appropriately
- [ ] Add `<article>` tags where appropriate
- [ ] Add `<aside>` tags for sidebars if needed

### 4.2 Accessibility Enhancements
- [ ] Add skip-to-content link
- [ ] Improve form label associations
- [ ] Add ARIA labels to interactive elements
- [ ] Add ARIA roles where needed
- [ ] Ensure keyboard navigation works
- [ ] Add focus indicators
- [ ] Test with screen readers
- [ ] Add alt text to all images (if missing)

### 4.3 Meta Tags Standardization
- [ ] Standardize viewport meta tag
- [ ] Add Open Graph tags to all pages
- [ ] Add Twitter Card tags to all pages
- [ ] Add canonical URLs
- [ ] Add robots meta tags where needed
- [ ] Ensure consistent meta description format

### 4.4 Page Structure Standardization
- [ ] Ensure consistent DOCTYPE
- [ ] Standardize html lang attribute
- [ ] Ensure consistent body structure
- [ ] Standardize section class naming
- [ ] Ensure footer appears on all public pages
- [ ] Standardize container usage

## Phase 5: Code Quality

### 5.1 Code Review
- [ ] Remove any remaining duplicate code
- [ ] Ensure consistent indentation
- [ ] Remove unused HTML elements
- [ ] Optimize component code
- [ ] Add JSDoc comments to components
- [ ] Review component APIs for consistency

### 5.2 Documentation
- [ ] Document component usage
- [ ] Create component examples
- [ ] Update README with component system info
- [ ] Document page structure standards
- [ ] Create migration guide for future pages

### 5.3 Testing
- [ ] Test all pages in Chrome
- [ ] Test all pages in Firefox
- [ ] Test all pages in Safari
- [ ] Test all pages in Edge
- [ ] Test mobile responsiveness
- [ ] Test tablet responsiveness
- [ ] Test navigation functionality
- [ ] Test form submissions
- [ ] Test lightbox functionality
- [ ] Test age verification modal
- [ ] Validate HTML with W3C validator
- [ ] Test accessibility with Lighthouse
- [ ] Test page load performance

## Phase 6: Cleanup & Optimization

### 6.1 File Cleanup
- [ ] Remove any backup HTML files
- [ ] Remove unused HTML templates (if any)
- [ ] Clean up component code
- [ ] Remove debug code

### 6.2 Performance Optimization
- [ ] Minimize component code
- [ ] Optimize component rendering
- [ ] Ensure components don't block rendering
- [ ] Test page load times
- [ ] Optimize component caching

### 6.3 Final Validation
- [ ] Run HTML validator on all pages
- [ ] Run accessibility audit
- [ ] Run Lighthouse audit
- [ ] Check for console errors
- [ ] Verify all links work
- [ ] Test in production environment

## Phase 7: Future Enhancements (Optional)

### 7.1 Advanced Features
- [ ] Consider server-side rendering
- [ ] Consider static site generation
- [ ] Consider Web Components
- [ ] Consider build system integration
- [ ] Consider component versioning

### 7.2 Monitoring
- [ ] Set up error tracking for components
- [ ] Monitor component performance
- [ ] Track component usage
- [ ] Collect user feedback

## Notes

- Components should be loaded before page content renders
- Consider using DOMContentLoaded for component initialization
- Ensure components work without JavaScript (progressive enhancement)
- Maintain backward compatibility during migration
- Test each page after component integration
- Keep original HTML files as backup until migration complete

## Estimated Timeline

- **Phase 1**: 1-2 days (Component Infrastructure)
- **Phase 2**: 3-5 days (Component Implementation)
- **Phase 3**: 2-3 days (Page Migration)
- **Phase 4**: 2-3 days (Structure Improvements)
- **Phase 5**: 1-2 days (Code Quality)
- **Phase 6**: 1-2 days (Cleanup)
- **Total**: 10-17 days

## Success Criteria

- [ ] All common HTML components extracted
- [ ] Zero duplication in navigation, footer, head sections
- [ ] All pages use component system
- [ ] HTML validation passes for all pages
- [ ] Accessibility score > 90 for all pages
- [ ] Page load times maintained or improved
- [ ] All functionality preserved
- [ ] Code is maintainable and well-documented
