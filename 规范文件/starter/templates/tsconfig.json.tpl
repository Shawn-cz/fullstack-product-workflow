{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@contracts/*": ["shared/contracts/*"]
    }
  },
  "include": [
    "src",
    "server",
    "shared",
    "tests",
    "prisma/seed.ts",
    "prisma/test-accounts.ts",
    "playwright.config.ts"
  ]
}
