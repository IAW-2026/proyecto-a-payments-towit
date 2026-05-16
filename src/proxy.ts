import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher(['/', '/api/(.*)']);

// Define the home route matcher for the root path
const isHomeRoute = createRouteMatcher(['/']);

export default clerkMiddleware(async (auth, req) => {
    // Get authentication information about the current user
    const { userId } = await auth();

    if (userId && isHomeRoute(req)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    if (!isPublicRoute(req)) {
        await auth.protect();
    }
});

export const config = {
  matcher: [
    // Ignorar archivos internos de Next.js y archivos estáticos (imágenes, css, etc.)
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Aplicar siempre el middleware a las rutas de la API para que nuestra lógica las evalúe
    '/(api|trpc)(.*)',
  ],
};