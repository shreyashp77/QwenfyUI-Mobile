/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./App.tsx",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
        "./utils/**/*.{js,ts,jsx,tsx}",
        "./constants.ts"
    ],
    // Safelist dynamic classes used in code (e.g. bg-purple-600, text-blue-500)
    safelist: [
        {
            pattern: /(bg|text|border|ring)-(purple|violet|fuchsia|pink|rose|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|custom)-(100|200|300|400|500|600|700|800|900)/,
            variants: ['hover', 'focus', 'dark', 'active', 'group-hover'],
        },
        // Also cover cases without shade (if any) or specific shades used often
        {
            pattern: /bg-(purple|violet|fuchsia|pink|rose|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|custom)-600/,
        }

    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                gray: {
                    750: '#2d3748',
                    850: '#1a202c',
                    950: '#0d1117',
                },
                custom: {
                    200: 'var(--theme-200)',
                    300: 'var(--theme-300)',
                    400: 'var(--theme-400)',
                    500: 'var(--theme-500)',
                    600: 'var(--theme-600)',
                    700: 'var(--theme-700)',
                    900: 'var(--theme-900)',
                }
            }
        }
    },
    plugins: [],
}
