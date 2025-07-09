# Dark Mode Implementation

This document describes the dark mode implementation in the ThanksDoc application.

## Overview

The application has been configured to always use dark mode, regardless of the user's system preferences or browser settings. This ensures a consistent dark-themed experience for all users.

## Implementation Details

1. **ThemeContext.js**
   - Created a global theme context that enforces dark mode
   - Prevents switching to light mode

2. **globals.css**
   - Updated all CSS variables to use dark mode colors
   - Removed media queries that would switch between light/dark modes
   - Set HTML `color-scheme` to dark

3. **tailwind.config.js**
   - Using Tailwind's 'class' strategy for dark mode
   - The 'dark' class is always applied to the HTML element

4. **useTheme.js Hook**
   - Provides helper functions for consistent theme usage
   - Always returns dark mode values for theming functions

5. **layout.js**
   - Added `className="dark"` to the HTML element
   - Wrapped the application in ThemeProvider

## Usage in Components

When creating or modifying components:

1. Use dark mode Tailwind classes directly (no conditionals needed)
2. Example:
   - ✅ `className="bg-gray-800 text-white"`
   - ❌ `className="bg-white dark:bg-gray-800 text-black dark:text-white"`

3. For custom styling, always use dark theme colors

## Extending

If you need to add more themed components:

1. Add styles to globals.css using dark theme colors
2. Use the `useTheme` hook if you need theme-related helper functions
